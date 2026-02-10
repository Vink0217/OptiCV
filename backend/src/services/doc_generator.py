from io import BytesIO
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from src.models.schemas import ResumeData


def _add_bottom_border(paragraph):
    """Add a thin bottom border (horizontal rule) to a paragraph."""
    pPr = paragraph.paragraph_format.element.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "4")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "000000")
    pBdr.append(bottom)
    pPr.append(pBdr)


def _set_run_font(run, name="Times New Roman", size=10.5, bold=False, italic=False):
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic


def _add_section_heading(doc, title: str):
    """ALL-CAPS bold heading with horizontal rule underneath."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(title.upper())
    _set_run_font(run, bold=True)
    _add_bottom_border(p)
    return p


def _add_two_column_line(doc, left: str, right: str, bold=False, italic=False):
    """Add a line with left text and right-aligned text using a tab stop."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    # Right-aligned tab stop at page width
    tab_stops = p.paragraph_format.tab_stops
    tab_stops.add_tab_stop(Inches(6.5), alignment=WD_ALIGN_PARAGRAPH.RIGHT)
    run_left = p.add_run(left)
    _set_run_font(run_left, bold=bold, italic=italic)
    p.add_run("\t")
    run_right = p.add_run(right)
    _set_run_font(run_right, bold=bold, italic=italic)
    return p


def _add_bullet(doc, text: str):
    """Add a bullet-point paragraph."""
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.clear()
    run = p.add_run(text)
    _set_run_font(run)
    return p


def generate_docx_bytes(resume: ResumeData) -> bytes:
    doc = Document()

    # Set narrow margins
    for section in doc.sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # ── Name ─────────────────────────────────────────────────────
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(resume.full_name)
    _set_run_font(run, size=18, bold=True)

    # ── Contact line ─────────────────────────────────────────────
    contact_parts = []
    if resume.phone:
        contact_parts.append(resume.phone)
    if resume.email:
        contact_parts.append(resume.email)
    if contact_parts:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        run = p.add_run(" | ".join(contact_parts))
        _set_run_font(run)

    # ── Summary ──────────────────────────────────────────────────
    if resume.summary:
        _add_section_heading(doc, "Summary")
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        run = p.add_run(resume.summary)
        _set_run_font(run)

    # ── Experience ───────────────────────────────────────────────
    if resume.experience:
        _add_section_heading(doc, "Experience")
        for exp in resume.experience:
            _add_two_column_line(doc, exp.company or "", exp.location or "", bold=True)
            dates = f"{exp.start_date or ''} - {exp.end_date or 'Present'}"
            _add_two_column_line(doc, exp.job_title or "", dates, italic=True)
            for r in (exp.responsibilities or []):
                _add_bullet(doc, r)

    # ── Projects ─────────────────────────────────────────────────
    if resume.projects:
        _add_section_heading(doc, "Projects")
        for proj in resume.projects:
            techs = ", ".join(proj.technologies or [])
            link = proj.link or ""
            
            # 1. Title Line
            if link and (link.startswith("http://") or link.startswith("https://")):
                 # Title vs Link (Clickable?) - simplistic approach: Title vs Link Text
                 # python-docx is tricky with hyperlinks in the same run as separate text
                 # simpler: Title on Left, Link Text on Right
                 _add_two_column_line(doc, proj.title or "", link, bold=True)
            else:
                 # Just title or Title vs Link text
                 _add_two_column_line(doc, proj.title or "", link, bold=True)
            
            # 2. Technologies Line
            if techs:
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                run = p.add_run(f"Technologies: {techs}")
                _set_run_font(run, italic=True)

            # 3. Description
            if proj.description:
                _add_bullet(doc, proj.description)

    # ── Skills ───────────────────────────────────────────────────
    if resume.skills:
        _add_section_heading(doc, "Skills")
        for skill in resume.skills:
             # Clean leading bullets if present (to avoid double bulleting)
            text = skill.lstrip(" •●-")
            if not text: continue
            _add_bullet(doc, text)

    # ── Education ────────────────────────────────────────────────
    if resume.education:
        _add_section_heading(doc, "Education")
        for ed in resume.education:
            _add_two_column_line(doc, ed.institution or "", ed.location or "", bold=True)
            _add_two_column_line(doc, ed.degree or "", ed.graduation_date or "", italic=True)

    # ── Certifications ───────────────────────────────────────────
    if resume.certifications:
        _add_section_heading(doc, "Certifications")
        for cert in resume.certifications:
            _add_bullet(doc, cert)

    bio = BytesIO()
    doc.save(bio)
    bio.seek(0)
    return bio.read()

