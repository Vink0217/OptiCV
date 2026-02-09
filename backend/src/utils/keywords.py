"""
Keyword extraction and matching utilities for ATS scoring.
"""
import re
from collections import Counter
import hashlib
import time
from pathlib import Path

import json
from math import sqrt
from ..services.gemini import get_gemini_client

# Load a small canonical skills ontology (alias -> canonical mapping)
try:
    with open("backend/data/skills_ontology.json", "r", encoding="utf-8") as f:
        _ONTOLOGY = json.load(f)
except Exception:
    _ONTOLOGY = {}

# Build alias -> canonical lookup
_ALIAS_TO_CANONICAL: dict[str, str] = {}
for canonical, aliases in _ONTOLOGY.items():
    # include the canonical itself as an alias
    _ALIAS_TO_CANONICAL[canonical.lower()] = canonical
    for a in aliases:
        _ALIAS_TO_CANONICAL[a.lower()] = canonical

# Small built-in acronym expansions as a fallback
ACRONYM_EXPANSIONS = {
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "nlp": "natural language processing",
    "seo": "search engine optimization",
    "api": "application programming interface",
    "sql": "structured query language",
    "ci/cd": "continuous integration continuous deployment",
    "aws": "amazon web services",
    "gcp": "google cloud platform",
}


def normalize_text(text: str) -> str:
    """Normalize text: lowercase, remove special chars, preserve spaces."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)  # Replace punctuation with spaces
    text = re.sub(r'\s+', ' ', text).strip()  # Collapse whitespace
    return text


def extract_keywords(text: str, top_n: int = 50) -> list[str]:
    """
    Extract important keywords from text using frequency analysis.
    
    Args:
        text: Input text (job description or resume)
        top_n: Number of top keywords to return
    
    Returns:
        List of keywords sorted by frequency (descending)
    """
    # Normalize and tokenize
    normalized = normalize_text(text)
    words = normalized.split()
    
    # Filter out common stop words and very short words
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
        'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should',
        'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their'
    }
    
    filtered_words = [w for w in words if w not in stop_words and len(w) > 2]
    
    # Count frequencies
    word_counts = Counter(filtered_words)
    
    # Return top N keywords
    return [word for word, _ in word_counts.most_common(top_n)]


# --- JD expansion + caching to reduce LLM calls ---
_CACHE_PATH = Path("data/jd_keyword_cache.json")
_CACHE_TTL = 60 * 60 * 24 * 30  # 30 days


def _load_cache() -> dict:
    if not _CACHE_PATH.exists():
        return {}
    try:
        return json.loads(_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(cache: dict) -> None:
    try:
        _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        _CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def expand_jd_keywords_via_gemini(job_description: str, max_keywords: int = 40) -> list[str]:
    """Use Gemini to expand a JD into a list of relevant skill keywords (cached)."""
    key = hashlib.sha256(job_description.encode("utf-8")).hexdigest()
    cache = _load_cache()
    entry = cache.get(key)
    if entry and (time.time() - entry.get("ts", 0) < _CACHE_TTL):
        return entry.get("keywords", [])

    # Call Gemini to extract keywords (best-effort). Import here to avoid circular imports.
    try:
        from ..services.gemini import get_gemini_client
        client = get_gemini_client()
        prompt = (
            "List the top {n} skills or keywords that are relevant for the following job description. "
            "Return as a comma-separated list.\n\nJOB DESCRIPTION:\n{jd}"
        ).format(n=max_keywords, jd=job_description)
        resp = client.generate_text(prompt, temperature=0.0)
        # Parse comma/newline separated output
        parts = re.split(r'[\n,;]+', resp)
        keywords = [normalize_text(p) for p in parts if p.strip()]
    except Exception:
        keywords = []

    # Fallback to frequency-based extraction if Gemini fails
    if not keywords:
        keywords = extract_keywords(job_description, top_n=max_keywords)

    # Map keywords to canonical where possible and dedupe
    mapped = []
    for k in keywords:
        k_clean = k.strip()
        if not k_clean:
            continue
        canonical = _ALIAS_TO_CANONICAL.get(k_clean) or _ALIAS_TO_CANONICAL.get(k_clean.lower())
        mapped.append(canonical or k_clean)

    # Save cache
    cache[key] = {"ts": time.time(), "keywords": mapped}
    _save_cache(cache)
    return mapped


def get_jd_keywords(job_description: str, top_n: int = 30) -> list[str]:
    """Get JD keywords using frequency extraction + Gemini expansion (cached)."""
    base = extract_keywords(job_description, top_n=top_n)
    expanded = expand_jd_keywords_via_gemini(job_description, max_keywords=top_n)
    # Combine while preserving order and uniqueness
    seen = set()
    result = []
    for k in base + expanded:
        k_norm = normalize_text(k)
        if k_norm not in seen:
            seen.add(k_norm)
            result.append(k_norm)
    return result


def match_keywords(resume_text: str, jd_keywords: list[str]) -> dict:
    """
    Match JD keywords against resume text.
    
    Args:
        resume_text: Resume text to search in
        jd_keywords: List of keywords from job description
    
    Returns:
        Dict with matched keywords, missing keywords, and match percentage
    """
    resume_normalized = normalize_text(resume_text)
    
    matched = []
    missing = []
    semantically_matched = []
    
    for keyword in jd_keywords:
        keyword_norm = normalize_text(keyword)
        
        # Check exact match
        if keyword_norm in resume_normalized:
            matched.append(keyword)
            continue
        
        # Check acronym expansion
        acronym_expanded = ACRONYM_EXPANSIONS.get(keyword_norm)
        if acronym_expanded and acronym_expanded in resume_normalized:
            matched.append(keyword)
            continue
        
        # Check reverse (expansion → acronym)
        found_acronym = False
        for acronym, expansion in ACRONYM_EXPANSIONS.items():
            if keyword_norm == expansion and acronym in resume_normalized:
                matched.append(keyword)
                found_acronym = True
                break
        
        if not found_acronym:
            # Map to canonical if available
            canonical = _ALIAS_TO_CANONICAL.get(keyword_norm)
            if canonical:
                # check canonical term presence
                if canonical.lower() in resume_normalized:
                    matched.append(keyword)
                    continue
            missing.append(keyword)
    
    # Attempt semantic matching for missing keywords using embeddings
    if missing:
        try:
            client = get_gemini_client()
            resume_emb = client.embed_text(resume_text)
            if resume_emb:
                for kw in list(missing):
                    kw_emb = client.embed_text(kw)
                    if not kw_emb:
                        continue
                    # cosine similarity
                    dot = sum(a * b for a, b in zip(resume_emb, kw_emb))
                    mag_a = sqrt(sum(a * a for a in resume_emb))
                    mag_b = sqrt(sum(b * b for b in kw_emb))
                    sim = dot / (mag_a * mag_b) if mag_a and mag_b else 0
                    if sim >= 0.78:
                        semantically_matched.append(kw)
                        matched.append(kw)
                        missing.remove(kw)
        except Exception:
            # If embeddings fail, ignore semantic step
            pass

    total = len(jd_keywords)
    match_percentage = (len(matched) / total * 100) if total > 0 else 0
    
    return {
        "matched": matched,
        "missing": missing,
        "semantically_matched": semantically_matched,
        "match_percentage": round(match_percentage, 1),
        "total_keywords": total,
        "matched_count": len(matched)
    }


def extract_bigrams(text: str) -> list[str]:
    """Extract two-word phrases (bigrams) for better keyword matching."""
    normalized = normalize_text(text)
    words = normalized.split()
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
    return bigrams

