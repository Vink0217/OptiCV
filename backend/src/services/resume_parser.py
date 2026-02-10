"""
Resume parsing utilities: extract text from PDF or DOCX uploads.
"""
from typing import Optional
import io

def extract_text_from_pdf_bytes(data: bytes) -> str:
	# Prefer pdfplumber if available (it provides hyperlink extraction).
	# If pdfplumber isn't installed (or fails to build on the host),
	# fall back to pdfminer.six which is lighter and already in
	# requirements.txt for plain-text extraction.
	try:
		import pdfplumber  # type: ignore
	except Exception:
		# Fallback: use pdfminer.six to extract text
		try:
			from pdfminer.high_level import extract_text_to_fp
			from pdfminer.layout import LAParams
			from io import BytesIO

			output = BytesIO()
			extract_text_to_fp(BytesIO(data), output, laparams=LAParams())
			text = output.getvalue().decode('utf-8', errors='ignore')
			return text.strip()
		except Exception as e:
			raise RuntimeError(
				"No suitable PDF parser is available. Install `pdfplumber` or ensure `pdfminer.six` is installed. "
				f"Underlying error: {e}"
			)

	# If we reach here, pdfplumber is available
	with pdfplumber.open(io.BytesIO(data)) as pdf:
		pages = []
		links = []
		for p in pdf.pages:
			pages.append(p.extract_text() or "")
			# Extract hyperlinks if available
			if hasattr(p, "hyperlinks"):
				for link in p.hyperlinks:
					uri = link.get("uri")
					if uri:
						links.append(uri)

	full_text = "\n".join(pages).strip()

	# Append found links so the AI can associate them
	if links:
		full_text += "\n\n--- EXTRACTED HYPERLINKS ---\n" + "\n".join(sorted(list(set(links))))

	return full_text


def extract_text_from_docx_bytes(data: bytes) -> str:
	# Lazy import python-docx to avoid crash if not installed at import time
	try:
		from docx import Document  # type: ignore
	except Exception as e:
		raise RuntimeError(
			"python-docx is required to parse DOCX resumes. "
			"Install it (e.g. `pip install python-docx`) or include it in your deployment requirements. "
			f"Underlying error: {e}"
		)

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


