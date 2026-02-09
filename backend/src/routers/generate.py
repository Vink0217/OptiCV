from fastapi import APIRouter, HTTPException
from ..models.schemas import ResumeInput, ResumeData
from ..models.prompts import RESUME_GENERATION_PROMPT, format_job_description_section, format_existing_resume_section
from ..services.gemini import GeminiClient
from ..services.ats_scorer import get_ats_scorer

router = APIRouter()


@router.post("/generate")
async def generate_resume(input_data: ResumeInput):
    """Generate ATS-optimized resume from user input."""
    try:
        client = GeminiClient()
        prompt = RESUME_GENERATION_PROMPT.format(
            full_name=input_data.full_name,
            phone=input_data.phone,
            email=input_data.email,
            target_role=input_data.target_role,
            job_description_section=format_job_description_section(input_data.job_description),
            existing_resume_section=format_existing_resume_section(input_data.existing_resume_text)
        )
        resume_data = client.generate_structured(prompt, ResumeData, temperature=0.8)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate resume: {e}")

    # Score the generated resume
    scorer = get_ats_scorer()
    score = scorer.score_resume(resume_data.summary, input_data.job_description)

    return {"resume_data": resume_data.dict(), "ats_score": score.dict()}
