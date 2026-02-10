from io import BytesIO
from fpdf import FPDF
from src.models.schemas import ResumeData

# Layout constants (US Letter: 612x792pt -> 215.9x279.4mm)
L_MARGIN = 19  # ~54pt
R_MARGIN = 19
BODY_W = 215.9 - L_MARGIN - R_MARGIN  # effective text width


def _s(text: str | None) -> str:
    """Sanitize text for latin-1 PDF output."""
    if not text:
        return ""
    return str(text).replace("\u2014", "-").replace("\u2013", "-").replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"').encode("latin-1", errors="replace").decode("latin-1")


class ResumePDF(FPDF):
    """Custom PDF matching a professional ATS resume template."""

    def __init__(self):
        super().__init__(format="letter")
        self.set_margins(L_MARGIN, 15, R_MARGIN)
        self.set_auto_page_break(True, margin=15)
        # Always use standard, built-in fonts for extractability
        self.set_font("Times", "", 10.5)
        self.core_fonts_encoding = "WinAnsiEncoding"

    # ── drawing helpers ──────────────────────────────────────────

    def section_heading(self, title: str):
        """ALL-CAPS bold heading with a horizontal rule underneath."""
        self.ln(3)
        self.set_font("Times", "B", 10.5)
        self.cell(0, 5, _s(title.upper()), ln=1)
        y = self.get_y()
        self.line(L_MARGIN, y, 215.9 - R_MARGIN, y)
        self.ln(1)

    def left_right_line(self, left: str, right: str, style: str = "", size: float = 10.5):
        """Print two strings on one line: left-aligned and right-aligned."""
        self.set_font("Times", style, size)
        self.cell(0, 5, _s(left))
        self.cell(0, 5, _s(right), ln=1, align="R")

    def bullet(self, text: str, indent: float = 0):
        """Bullet point with optional indent."""
        x = self.get_x() + indent
        self.set_font("Arial", "B", 10.5)
        self.set_x(x)
        self.cell(4, 5, chr(0x95))  # bullet char
        self.set_font("Times", "", 10.5)
        self.multi_cell(BODY_W - indent - 4, 5, _s(text))


def generate_pdf_bytes(resume: ResumeData) -> bytes:
    pdf = ResumePDF()
    pdf.add_page()

    # ── Name ─────────────────────────────────────────────────────
    pdf.set_font("Times", "B", 18)
    pdf.cell(0, 8, _s(resume.full_name), ln=1, align="C")

    # ── Contact line ─────────────────────────────────────────────
    contact_parts = []
    if resume.phone:
        contact_parts.append(resume.phone)
    if resume.email:
        contact_parts.append(resume.email)
    if contact_parts:
        pdf.set_font("Times", "", 10.5)
        pdf.cell(0, 5, _s(" | ".join(contact_parts)), ln=1, align="C")

    # ── Summary ──────────────────────────────────────────────────
    if resume.summary:
        pdf.section_heading("Summary")
        pdf.set_font("Times", "", 10.5)
        pdf.multi_cell(0, 5, _s(resume.summary))

    # ── Experience ───────────────────────────────────────────────
    if resume.experience:
        pdf.section_heading("Experience")
        for exp in resume.experience:
            company = exp.company or ""
            location = exp.location or ""
            pdf.left_right_line(company, location, style="B")
            dates = f"{exp.start_date or ''} - {exp.end_date or 'Present'}"
            pdf.left_right_line(exp.job_title or "", dates, style="I")
            for r in (exp.responsibilities or []):
                pdf.bullet(r, indent=2)
            pdf.ln(1)

    # ── Projects ─────────────────────────────────────────────────
    if resume.projects:
        pdf.section_heading("Projects")
        for proj in resume.projects:
            title = proj.title or ""
            techs = ", ".join(proj.technologies or [])
            link = proj.link or ""
            
            # 1. Title Line (Link on right if available)
            if link:
                pdf.left_right_line(title, link, style="B")
            else:
                pdf.set_font("Times", "B", 10.5)
                pdf.cell(0, 5, _s(title), ln=1)
                
            # 2. Technologies Line (New line, distinct from title)
            if techs:
                pdf.set_font("Times", "I", 10.5)
                pdf.cell(0, 5, _s(f"Technologies: {techs}"), ln=1)

            # 3. Description Bullets
            if proj.description:
                pdf.bullet(proj.description, indent=2)
            pdf.ln(1)

    # ── Skills ───────────────────────────────────────────────────
    if resume.skills:
        pdf.section_heading("Skills")
        for skill in resume.skills:
            # Clean leading bullets if present (to avoid double bulleting)
            text = skill.lstrip(" •●-")
            if not text: continue
            pdf.bullet(text)

    # ── Education ────────────────────────────────────────────────
    if resume.education:
        pdf.section_heading("Education")
        for ed in resume.education:
            institution = ed.institution or ""
            location = ed.location or ""
            pdf.left_right_line(institution, location, style="B")
            grad = ed.graduation_date or ""
            pdf.left_right_line(ed.degree or "", grad, style="I")

    # ── Certifications ───────────────────────────────────────────
    if resume.certifications:
        pdf.section_heading("Certifications")
        for cert in resume.certifications:
            pdf.bullet(cert)

    out = pdf.output(dest="S")
    if isinstance(out, str):
        return out.encode("latin-1")
    return bytes(out)

