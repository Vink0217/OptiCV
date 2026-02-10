from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool
from ..models.schemas import ResumeInput, CombinedResumeResponse
from ..models.prompts import UNIFIED_RESUME_GENERATION_SCORING_PROMPT, format_job_description_section, format_existing_resume_section
from ..services.gemini import GeminiClient
import logging
import hashlib
import json
import time
from pathlib import Path

logger = logging.getLogger("opticv.generate")

router = APIRouter()

# Hybrid Cache Strategy: Memory + File (Best Effort)
MEMORY_CACHE = {}
MEMORY_CACHE_LIMIT = 50 

# File-based cache configuration
CACHE_DIR = Path("data/resume_cache")
try:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    # Fallback to /tmp if we can't write to data/resume_cache (e.g. Vercel/read-only)
    import tempfile
    CACHE_DIR = Path(tempfile.gettempdir()) / "opticv_cache"
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass # If we can't even make a tmp dir, we'll rely solely on MEMORY_CACHE

CACHE_TTL = 60 * 60 * 24 * 7  # 7 days


def _get_cache_key(input_data: ResumeInput) -> str:
    """Generate cache key from input data."""
    # Version 3: invalidated previous cache to ensure LinkedIn/Location fields are processed
    CACHE_VERSION = "v3"
    content = f"{CACHE_VERSION}|{input_data.full_name}|{input_data.email}|{input_data.linkedin or ''}|{input_data.location or ''}|{input_data.target_role}|{input_data.job_description or ''}|{input_data.existing_resume_text or ''}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _load_from_cache(cache_key: str) -> dict | None:
    """Load cached resume if exists and not expired."""
    current_time = time.time()

    # 1. Check Memory Cache first (Fastest, works in serverless warm starts)
    if cache_key in MEMORY_CACHE:
        data = MEMORY_CACHE[cache_key]
        if current_time - data.get("timestamp", 0) < CACHE_TTL:
             logger.info("Memory Cache hit for key=%s", cache_key[:16])
             return data.get("result")
        else:
            del MEMORY_CACHE[cache_key]

    # 2. Check File Cache (Persistence across restarts if filesystem allows)
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if not cache_file.exists():
        return None
    
    try:
        data = json.loads(cache_file.read_text(encoding="utf-8"))
        if current_time - data.get("timestamp", 0) < CACHE_TTL:
            logger.info("File Cache hit for key=%s", cache_key[:16])
            
            # Repopulate memory cache
            if len(MEMORY_CACHE) >= MEMORY_CACHE_LIMIT:
                MEMORY_CACHE.pop(next(iter(MEMORY_CACHE)))
            MEMORY_CACHE[cache_key] = data
            
            return data.get("result")
        else:
            logger.info("Cache expired for key=%s", cache_key[:16])
            try:
                cache_file.unlink()  # Delete expired cache
            except OSError:
                pass
    except Exception as e:
        logger.warning("Failed to load cache: %s", e)
    
    return None


def _save_to_cache(cache_key: str, result: dict) -> None:
    """Save result to cache."""
    data = {"timestamp": time.time(), "result": result}
    
    # 1. Save to Memory
    if len(MEMORY_CACHE) >= MEMORY_CACHE_LIMIT:
        # Simple FIFO eviction
        MEMORY_CACHE.pop(next(iter(MEMORY_CACHE)))
    MEMORY_CACHE[cache_key] = data

    # 2. Save to File (Best effort for persistence)
    try:
        if not CACHE_DIR.exists():
             CACHE_DIR.mkdir(parents=True, exist_ok=True)
             
        cache_file = CACHE_DIR / f"{cache_key}.json"
        cache_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        logger.info("Saved to cache key=%s", cache_key[:16])
    except Exception as e:
        logger.warning("Failed to save file cache (relying on memory): %s", e)


@router.post("/generate")
async def generate_resume(input_data: ResumeInput):
    """Generate ATS-optimized resume with scoring in a SINGLE LLM call."""
    try:
        logger.info("/generate called for %s", input_data.full_name)
        
        # Check cache first
        cache_key = _get_cache_key(input_data)
        cached = _load_from_cache(cache_key)
        if cached:
            logger.info("Returning cached result")
            return cached
        
        # Single unified LLM call for generation + scoring
        logger.info("Making single unified LLM call (generation + scoring)")
        client = GeminiClient()
        
        # Use simple replacement instead of .format() to avoid issues with JSON braces in the prompt
        prompt = UNIFIED_RESUME_GENERATION_SCORING_PROMPT.replace(
            "{full_name}", input_data.full_name
        ).replace(
            "{phone}", input_data.phone
        ).replace(
            "{email}", input_data.email
        ).replace(
            "{linkedin}", input_data.linkedin or ""
        ).replace(
            "{location}", input_data.location or ""
        ).replace(
            "{target_role}", input_data.target_role
        ).replace(
            "{job_description_section}", format_job_description_section(input_data.job_description)
        ).replace(
            "{existing_resume_section}", format_existing_resume_section(input_data.existing_resume_text)
        )
        
        result = await run_in_threadpool(
            client.generate_structured, 
            prompt=prompt, 
            response_schema=CombinedResumeResponse, 
            temperature=0.7
        )
        
        # Override contact info with input data to ensure accuracy
        resume_data_dict = result.resume_data.dict()
        resume_data_dict["linkedin"] = input_data.linkedin
        resume_data_dict["location"] = input_data.location
        
        response = {
            "resume_data": resume_data_dict,
            "ats_score": result.ats_score.dict()
        }
        
        # Save to cache
        _save_to_cache(cache_key, response)
        
        logger.info("Resume generated successfully with ATS score=%d (1 LLM call)", result.ats_score.overall_score)
        return response
        
    except Exception as e:
        logger.exception("generate_resume failed")
        raise HTTPException(status_code=500, detail=f"Failed to generate resume: {e}")
