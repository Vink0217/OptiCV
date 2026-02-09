"""
Resume parsing utilities: extract text from PDF or DOCX uploads.
"""
from typing import Optional
import io
import pdfplumber
from docx import Document

def extract_text_from_pdf_bytes(data: bytes) -> str:
	if pdfplumber is None:
		raise RuntimeError("pdfplumber is not installed")
	with pdfplumber.open(io.BytesIO(data)) as pdf:
		pages = [p.extract_text() or "" for p in pdf.pages]
	return "\n".join(pages).strip()


def extract_text_from_docx_bytes(data: bytes) -> str:
	bio = io.BytesIO(data)
	doc = Document(bio)
	paragraphs = [p.text for p in doc.paragraphs]
	return "\n".join(paragraphs).strip()


def parse_resume_bytes(data: bytes, filename: str) -> str:
	"""Parse resume bytes by filename extension. Returns extracted plain text."""
	fname = filename.lower()
	if fname.endswith(".pdf"):
		return extract_text_from_pdf_bytes(data)
	if fname.endswith(".docx"):
		return extract_text_from_docx_bytes(data)
	# Fallback: try to decode as text
	try:
		return data.decode("utf-8", errors="ignore")
	except Exception:
		return ""


