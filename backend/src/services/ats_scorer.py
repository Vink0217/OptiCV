"""
Hybrid ATS scoring engine combining algorithmic and AI-based evaluation.
This is the differentiator: transparent algorithmic layer + nuanced AI layer.
"""
import re
from ..models.schemas import ATSScore
from ..models.prompts import ATS_SCORING_PROMPT
from ..utils.keywords import get_jd_keywords, match_keywords, extract_keywords
from .gemini import get_gemini_client


class ATSScorer:
    """Hybrid ATS scoring system."""
    
    def __init__(self):
        self.gemini = get_gemini_client()
    
    def score_resume(self, resume_text: str, job_description: str | None = None) -> ATSScore:
        """
        Score resume using hybrid approach (algorithmic + AI).
        
        Args:
            resume_text: The resume text to score
            job_description: Optional job description to compare against
        
        Returns:
            ATSScore with detailed breakdown
        """
        # --- Algorithmic Scoring ---
        if job_description:
            keyword_score = self._score_keywords(resume_text, job_description)
        else:
            # Score keywords based on common tech/role keywords in resume
            resume_keywords = extract_keywords(resume_text, top_n=30)
            # Score based on diversity and presence of strong keywords
            keyword_score = min(100, 40 + len(set(resume_keywords)))
        section_score = self._score_sections(resume_text)
        formatting_score = self._score_formatting(resume_text)
        
        # --- AI Scoring (via Gemini) ---
        if job_description:
            ai_scores = self._get_ai_scores(resume_text, job_description)
            role_alignment = ai_scores.get("role_alignment", 70)
            content_quality = ai_scores.get("content_quality", 70)
            explanation = ai_scores.get("explanation", "Resume evaluated against job requirements.")
            missing_keywords = ai_scores.get("missing_keywords", [])
            suggestions = ai_scores.get("suggestions", [])
        else:
            # No JD provided: use AI to assess general quality
            try:
                prompt = (
                    "You are an ATS analyzer. Evaluate this resume for general job-seeking quality. "
                    "Score on a 0-100 scale for: role alignment (how well the resume narrative fits a typical tech/engineering role), "
                    "content quality (action verbs, quantified achievements, clarity), and provide 2-3 improvement suggestions. "
                    "Output: role_alignment, content_quality, explanation, suggestions.\n\nRESUME:\n" + resume_text
                )
                result = self.gemini.generate_structured(
                    prompt=prompt,
                    response_schema=ATSScore,
                    temperature=0.3  # Lower temperature for consistent scoring
                )
                role_alignment = result.role_alignment
                content_quality = result.content_quality
                explanation = result.explanation
                missing_keywords = []
                suggestions = result.suggestions
            except Exception:
                role_alignment = 70
                content_quality = 70
                explanation = "Resume scored without job description. Assessed for general quality."
                missing_keywords = []
                suggestions = ["Add a job description for targeted optimization suggestions."]

        # --- Calculate Overall Score (weighted) ---
        overall = round(
            keyword_score * 0.30 +
            section_score * 0.20 +
            formatting_score * 0.10 +
            role_alignment * 0.25 +
            content_quality * 0.15
        )
        
        return ATSScore(
            overall_score=overall,
            keyword_match=keyword_score,
            section_completeness=section_score,
            role_alignment=role_alignment,
            formatting_score=formatting_score,
            content_quality=content_quality,
            explanation=explanation,
            missing_keywords=missing_keywords,
            suggestions=suggestions
        )
    
    def _score_keywords(self, resume_text: str, job_description: str) -> int:
        """Algorithmic keyword matching (30% of total score).

        Uses cached Gemini expansions plus frequency extraction to minimize API calls.
        """
        jd_keywords = get_jd_keywords(job_description, top_n=30)
        match_result = match_keywords(resume_text, jd_keywords)
        return min(100, round(match_result["match_percentage"]))
    
    def _score_sections(self, resume_text: str) -> int:
        """Check for standard ATS sections (20% of total score)."""
        text_lower = resume_text.lower()
        
        # Standard sections to look for
        sections = {
            "summary": ["summary", "profile", "objective"],
            "experience": ["experience", "work history", "employment"],
            "education": ["education", "academic", "degree"],
            "skills": ["skills", "technical skills", "competencies"],
            "projects": ["projects", "portfolio"],
        }
        
        found_count = 0
        for section_variants in sections.values():
            if any(variant in text_lower for variant in section_variants):
                found_count += 1
        
        # 5 sections = 100%, scale proportionally
        score = (found_count / len(sections)) * 100
        return round(score)
    
    def _score_formatting(self, resume_text: str) -> int:
        """Check ATS-safe formatting (10% of total score)."""
        score = 100  # Start perfect, deduct for issues
        
        # Deduct for special characters that may confuse ATS
        special_chars = re.findall(r'[^\w\s\-\(\)\[\]\/\.\,\:\;\@\+]', resume_text)
        if len(special_chars) > 10:
            score -= 20
        
        # Check for consistent date format (MM/YYYY or Month YYYY)
        date_patterns = re.findall(r'\b\d{1,2}/\d{4}\b|\b[A-Za-z]+\s+\d{4}\b', resume_text)
        if not date_patterns:
            score -= 15  # No dates found (unusual)
        
        # Deduct if text is too short (likely incomplete)
        if len(resume_text) < 200:
            score -= 30
        
        return max(0, score)
    
    def _get_ai_scores(self, resume_text: str, job_description: str) -> dict:
        """Get AI-based scores from Gemini (role alignment + content quality)."""
        try:
            prompt = ATS_SCORING_PROMPT.format(
                resume_text=resume_text,
                job_description=job_description
            )
            
            result = self.gemini.generate_structured(
                prompt=prompt,
                response_schema=ATSScore,
                temperature=0.3  # Lower temperature for consistent scoring
            )
            
            return {
                "role_alignment": result.role_alignment,
                "content_quality": result.content_quality,
                "explanation": result.explanation,
                "missing_keywords": result.missing_keywords,
                "suggestions": result.suggestions
            }
        except Exception as e:
            # Fallback if AI scoring fails
            print(f"AI scoring failed: {e}")
            return {
                "role_alignment": 70,
                "content_quality": 70,
                "explanation": "AI scoring unavailable. Using default scores.",
                "missing_keywords": [],
                "suggestions": ["Ensure API credentials are configured correctly."]
            }


# Singleton instance
_scorer_instance: ATSScorer | None = None


def get_ats_scorer() -> ATSScorer:
    """Get or create singleton ATS scorer instance."""
    global _scorer_instance
    if _scorer_instance is None:
        _scorer_instance = ATSScorer()
    return _scorer_instance

