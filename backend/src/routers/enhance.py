from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..models.prompts import SECTION_ENHANCEMENT_PROMPT
from ..services.gemini import GeminiClient
from ..utils.keywords import extract_keywords

router = APIRouter()


class EnhanceRequest(BaseModel):
    section_name: str
    current_content: str
    target_role: str
    job_description: str | None = None


@router.post("/enhance")
async def enhance_section(request: EnhanceRequest):
    """Enhance a specific resume section using AI."""
    jd_keywords = extract_keywords(request.job_description) if request.job_description else []
    
    try:
        client = GeminiClient()
        prompt = SECTION_ENHANCEMENT_PROMPT.format(
            section_name=request.section_name,
            current_content=request.current_content,
            target_role=request.target_role,
            jd_keywords=", ".join(jd_keywords[:15])
        )
        enhanced_text = client.generate_text(prompt, temperature=0.7)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enhance section: {e}")

    return {"enhanced_content": enhanced_text}
