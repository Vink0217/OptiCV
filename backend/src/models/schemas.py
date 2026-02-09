"""
Pydantic schemas for OptiCV backend.
These models define the data structures for resume input, output, scoring, and AI interactions.
All schemas work as Gemini structured output schemas.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# --- Input Models ---

class ResumeInput(BaseModel):
    """User input for resume generation."""
    full_name: str = Field(..., description="Full name of the candidate")
    phone: str = Field(..., description="Contact phone number")
    email: EmailStr = Field(..., description="Email address")
    target_role: str = Field(..., description="Target job role/title")
    job_description: Optional[str] = Field(None, description="Optional job description to optimize for")
    existing_resume_text: Optional[str] = Field(None, description="Optional existing resume text (extracted from upload)")


# --- Resume Data Models ---

class ExperienceEntry(BaseModel):
    """Single work experience entry."""
    job_title: str
    company: str
    location: Optional[str] = None
    start_date: str  # Format: MM/YYYY
    end_date: Optional[str] = None  # None means "Present"
    responsibilities: list[str] = Field(default_factory=list, description="Bullet points of responsibilities/achievements")


class EducationEntry(BaseModel):
    """Single education entry."""
    degree: str  # e.g., "B.Tech in Computer Science"
    institution: str
    location: Optional[str] = None
    graduation_date: str  # Format: MM/YYYY or YYYY
    gpa: Optional[str] = None
    relevant_coursework: list[str] = Field(default_factory=list)


class ProjectEntry(BaseModel):
    """Single project entry."""
    title: str
    description: str
    technologies: list[str] = Field(default_factory=list)
    link: Optional[str] = None  # GitHub, demo, etc.


class ResumeData(BaseModel):
    """Structured resume data output."""
    full_name: str
    phone: str
    email: str
    target_role: str
    summary: str = Field(..., description="Professional summary (2-3 sentences)")
    skills: list[str] = Field(default_factory=list, description="Hard and soft skills")
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    projects: list[ProjectEntry] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


# --- ATS Scoring Models ---

class ATSScore(BaseModel):
    """ATS scoring breakdown (0-100 scale)."""
    overall_score: int = Field(..., ge=0, le=100, description="Overall ATS score")
    keyword_match: int = Field(..., ge=0, le=100, description="Keyword match percentage")
    section_completeness: int = Field(..., ge=0, le=100, description="Section completeness score")
    role_alignment: int = Field(..., ge=0, le=100, description="Role alignment score")
    formatting_score: int = Field(..., ge=0, le=100, description="ATS-friendly formatting score")
    content_quality: int = Field(..., ge=0, le=100, description="Content quality score")
    explanation: str = Field(..., description="Brief explanation of the score")
    missing_keywords: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list, description="Actionable improvement suggestions")


class SkillGapAnalysis(BaseModel):
    """Analysis of skill gaps between resume and job description."""
    matched_skills: list[str] = Field(default_factory=list, description="Skills present in both JD and resume")
    missing_skills: list[str] = Field(default_factory=list, description="Skills in JD but not in resume")
    recommendations: list[str] = Field(default_factory=list, description="How to acquire/demonstrate missing skills")


# --- Chat Models ---

class ChatMessage(BaseModel):
    """Single chat message."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat request with context."""
    messages: list[ChatMessage]
    job_description: Optional[str] = None
    resume_context: Optional[str] = None
