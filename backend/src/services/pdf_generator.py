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

    def __init__(self, font_scale: float = 1.0):
        super().__init__(format="letter")
        self.scale = font_scale
        self.base_size = 10.5 * font_scale
        
        # Scale margins
        l_margin = L_MARGIN * font_scale
        r_margin = R_MARGIN * font_scale
        t_margin = 15 * font_scale
        
        self.set_margins(l_margin, t_margin, r_margin)
        self.set_auto_page_break(True, margin=t_margin)
        
        # Always use standard, built-in fonts for extractability
        self.set_font("Times", "", self.base_size)
        self.core_fonts_encoding = "WinAnsiEncoding"

    # ── drawing helpers ──────────────────────────────────────────

    def section_heading(self, title: str):
        """ALL-CAPS bold heading with a horizontal rule underneath."""
        self.ln(3 * self.scale)
        self.set_font("Times", "B", self.base_size)
        self.cell(0, 5 * self.scale, _s(title.upper()), ln=1)
        y = self.get_y()
        self.line(self.l_margin, y, 215.9 - self.r_margin, y)
        self.ln(1 * self.scale)

    def left_right_line(self, left: str, right: str, style: str = "", size_override: float = 0):
        """Print two strings on one line: left-aligned and right-aligned."""
        size = size_override if size_override > 0 else self.base_size
        self.set_font("Times", style, size)
        self.cell(0, 5 * self.scale, _s(left))
        self.cell(0, 5 * self.scale, _s(right), ln=1, align="R")

    def bullet(self, text: str, indent: float = 0):
        """Bullet point with optional indent."""
        x = self.get_x() + indent
        self.set_font("Arial", "B", self.base_size)
        self.set_x(x)
        self.cell(4, 5 * self.scale, chr(0x95))  # bullet char
        self.set_font("Times", "", self.base_size)
        # Calculate width dynamically based on margins
        width = 215.9 - self.l_margin - self.r_margin - indent - 4
        self.multi_cell(width, 5 * self.scale, _s(text))


def _build_pdf(resume: ResumeData, scale: float) -> ResumePDF:
    """Helper to build PDF with specific scaling."""
    pdf = ResumePDF(font_scale=scale)
    pdf.add_page()
    
    # Standard line height logic
    base_h = 5 * scale

    # ── Name ─────────────────────────────────────────────────────
    pdf.set_font("Times", "B", 18 * scale)
    pdf.cell(0, 8 * scale, _s(resume.full_name), ln=1, align="C")

    # ── Contact line ─────────────────────────────────────────────
    # Build list of items: (text, url)
    contact_items = []
    if resume.phone:
        contact_items.append((resume.phone, None))
    if resume.email:
        contact_items.append((resume.email, None))
    if resume.linkedin:
        contact_items.append(("LinkedIn", resume.linkedin))
    if resume.location:
        contact_items.append((resume.location, None))

    if contact_items:
        pdf.set_font("Times", "", pdf.base_size)
        
        # 1. Calculate total width to center the line
        separator = " | "
        sep_w = pdf.get_string_width(separator)
        total_w = 0
        
        # Calculate width of each segment
        widths = []
        for i, (text, _) in enumerate(contact_items):
            w = pdf.get_string_width(_s(text))
            widths.append(w)
            total_w += w
            if i < len(contact_items) - 1:
                total_w += sep_w
        
        # 2. Determine starting X
        # Effective page width = 215.9 - L_MARGIN - R_MARGIN
        # Center: L_MARGIN + (EffectiveWidth - TotalW) / 2
        page_width = 215.9
        effective_w = page_width - pdf.l_margin - pdf.r_margin
        start_x = pdf.l_margin + (effective_w - total_w) / 2
        
        # 3. Draw items
        pdf.set_y(pdf.get_y()) # Ensure we are on correct line
        pdf.set_x(start_x)
        
        for i, (text, url) in enumerate(contact_items):
            # Draw text or link
            if url:
                 pdf.set_text_color(0, 0, 255) # Blue
                 # Add underline style? FPDF doesn't have easy partial underline without cell.
                 # Simple trick: Using 'U' style if font allows, or just Blue color.
                 # Standard Times in FPDF usually supports 'U'
                 pdf.set_font("Times", "U", pdf.base_size)
                 pdf.cell(widths[i], base_h, _s(text), link=url, ln=0, align="L")
                 # Reset
                 pdf.set_text_color(0, 0, 0)
                 pdf.set_font("Times", "", pdf.base_size)
            else:
                 pdf.cell(widths[i], base_h, _s(text), ln=0, align="L")
            
            # Draw separator if not last
            if i < len(contact_items) - 1:
                pdf.cell(sep_w, base_h, separator, ln=0, align="L")
        
        pdf.ln(base_h) # Move to next line after loop

    # ── Summary ──────────────────────────────────────────────────
    if resume.summary:
        pdf.section_heading("Summary")
        pdf.set_font("Times", "", pdf.base_size)
        pdf.multi_cell(0, base_h, _s(resume.summary))

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
            pdf.ln(1 * scale)

    # ── Projects ─────────────────────────────────────────────────
    if resume.projects:
        pdf.section_heading("Projects")
        for proj in resume.projects:
            title = proj.title or ""
            techs = ", ".join(proj.technologies or [])
            link = proj.link or ""
            
            # 1. Title Line (Link on right if available - "GitHub Link")
            if link:
                pdf.set_font("Times", "B", pdf.base_size)
                pdf.cell(0, base_h, _s(title))
                
                # Right aligned link
                text = "GitHub Link"
                # Make ONLY "GitHub Link" clickable and blue
                pdf.set_text_color(0, 0, 255)
                # Reduced size for GitHub Link (base_size - 1)
                link_size = pdf.base_size - 1.0
                pdf.set_font("Times", "BU", link_size) 
                
                # Use multi_cell hack or just set X to right side?
                # align='R' with cell works relative to the cell width. 
                # If we use width=0, it goes to right margin.
                pdf.cell(0, base_h, _s(text), ln=1, align="R", link=link)
                
                # Reset
                pdf.set_text_color(0, 0, 0)
                pdf.set_font("Times", "", pdf.base_size)
            else:
                pdf.set_font("Times", "B", pdf.base_size)
                pdf.cell(0, base_h, _s(title), ln=1)
                
            # 2. Technologies Line (New line, distinct from title)
            if techs:
                pdf.set_font("Times", "I", pdf.base_size)
                pdf.cell(0, base_h, _s(f"Technologies: {techs}"), ln=1)

            # 3. Description Bullets
            if proj.description:
                pdf.bullet(proj.description, indent=2)
            pdf.ln(1 * scale)

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
            
    return pdf


def generate_pdf_bytes(resume: ResumeData) -> bytes:
    # Attempt 1: Standard scale
    pdf = _build_pdf(resume, scale=1.0)
    
    # If overflow, try scaling down
    if pdf.page_no() > 1:
        # Attempt 2: 92% scale (10.5 -> ~9.6)
        pdf = _build_pdf(resume, scale=0.92)
        
    if pdf.page_no() > 1:
        # Attempt 3: 85% scale (10.5 -> ~8.9)
        pdf = _build_pdf(resume, scale=0.85)

    out = pdf.output(dest="S")
    if isinstance(out, str):
        return out.encode("latin-1")
    return bytes(out)

