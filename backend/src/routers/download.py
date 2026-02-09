from io import BytesIO
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from src.models.schemas import ResumeData
from src.services.doc_generator import generate_docx_bytes
from src.services.pdf_generator import generate_pdf_bytes

router = APIRouter()


@router.post("/download")
async def download_resume(resume: ResumeData, format: str = Query("pdf", pattern="(?i)^(pdf|docx)$")):
    fmt = format.lower()
    if fmt == "pdf":
        data = generate_pdf_bytes(resume)
        media = "application/pdf"
        ext = "pdf"
    elif fmt == "docx":
        data = generate_docx_bytes(resume)
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ext = "docx"
    else:
        raise HTTPException(status_code=400, detail="format must be 'pdf' or 'docx'")

    name = (getattr(resume, 'full_name', None) or "resume").replace(" ", "_")
    filename = f"{name}.{ext}"
    return StreamingResponse(BytesIO(data), media_type=media, headers={"Content-Disposition": f"attachment; filename=\"{filename}\""})
