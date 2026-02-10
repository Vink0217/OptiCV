"""
Resume parsing utilities: extract text from PDF or DOCX uploads.
"""
from typing import Optional
import io

# Lazy imports for optional parsing dependencies. Importing heavy
# libs at module import time causes serverless cold-start failures
# if a dependency isn't available. Import inside functions and
# raise informative errors instead.

def extract_text_from_pdf_bytes(data: bytes) -> str:
	# Import pdfplumber lazily to avoid hard crash on import when
	# the package isn't installed in the runtime.
	try:
		import pdfplumber  # type: ignore
	except Exception as e:
		raise RuntimeError(
			"pdfplumber is required to parse PDF resumes. "
			"Install it (e.g. `pip install pdfplumber`) or include it in your deployment requirements. "
			f"Underlying error: {e}"
		)

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


