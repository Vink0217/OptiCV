from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from ..services.resume_parser import parse_resume_bytes
from ..services.gemini import GeminiClient
from ..services.ats_scorer import get_ats_scorer
from ..models.schemas import ResumeData

router = APIRouter()


@router.post("/parse")
async def parse_resume(file: UploadFile | None = File(None), text: str | None = Form(None), job_description: str | None = Form(None)):
    """Accepts uploaded resume or text, returns structured ResumeData + ATS score."""
    if file is None and not text:
        raise HTTPException(status_code=400, detail="Provide either an uploaded file or resume text.")

    extracted_text = ""
    if file is not None:
        content = await file.read()
        try:
            extracted_text = parse_resume_bytes(content, file.filename)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse file: {e}")
    else:
        extracted_text = text

    # Use Gemini to structure the extracted text
    try:
        client = GeminiClient()
        prompt = f"""Extract structured resume data from this text:

{extracted_text}

Return a structured resume with all available information."""
        resume_data = client.generate_structured(prompt, ResumeData, temperature=0.3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to structure resume: {e}")

    # Score the resume
    scorer = get_ats_scorer()
    score = scorer.score_resume(extracted_text, job_description)

    return {"resume_data": resume_data.dict(), "ats_score": score.dict()}
