from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.ats_scorer import get_ats_scorer
from ..models.schemas import SkillGapAnalysis
from ..services.gemini import GeminiClient
from ..utils.keywords import get_jd_keywords, extract_keywords

router = APIRouter()


from fastapi import UploadFile, File, Form

# Remove ScoreRequest, switch to file upload


@router.post("/score")
async def score_resume(
    file: UploadFile = File(...),
    job_description: str = Form(None)
):
    """Analyze resume file and return ATS score + skill gap analysis."""
    contents = await file.read()
    filename = file.filename or "resume.pdf"
    # Use resume_parser to extract text from PDF/DOCX or decode as text
    from ..services.resume_parser import parse_resume_bytes
    resume_text = parse_resume_bytes(contents, filename)
    if not resume_text or len(resume_text.strip()) < 10:
        # Fallback: try to decode as text
        try:
            resume_text = contents.decode("utf-8")
        except Exception:
            resume_text = contents.decode("latin-1")
    scorer = get_ats_scorer()
    ats_score = scorer.score_resume(resume_text, job_description)

    # Skill gap analysis
    if job_description:
        jd_keywords = get_jd_keywords(job_description)
        resume_keywords = extract_keywords(resume_text)
        matched = [k for k in jd_keywords if k.lower() in resume_keywords]
        missing = [k for k in jd_keywords if k.lower() not in resume_keywords][:10]
        skill_gap = SkillGapAnalysis(
            matched_skills=matched,
            missing_skills=missing,
            recommendations=[f"Consider adding '{skill}' to your resume" for skill in missing[:5]]
        )
    else:
        skill_gap = SkillGapAnalysis()

    return {"ats_score": ats_score.dict(), "skill_gap": skill_gap.dict()}
