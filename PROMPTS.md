# PROMPTS & AI Methodology

This document outlines the system instructions (prompts) used by Gemini to generate, score, and optimize resumes. It also explains the rationale behind the scoring algorithms.

## 1. Resume Generation & Optimization

**File:** `src/models/prompts.py`
**Trigger:** `/api/generate`

The generation prompt instructs Gemini to act as an "Elite ATS Resume Strategist".

### Key Instructions:
*   **Non-Negotiable Constraints:** Never fabricate data (companies, dates, degrees). If data is missing (e.g. skills), infer it from experience, but do not invent experiences.
*   **Structure:** Enforces specific ATS-friendly sections: Summary, Skills, Experience, Projects, Education, Certifications.
*   **Formatting:** Enforces "MMM YYYY" date format and single-line categorised skill lists to save space.
*   **Hyperlink Preservation:** Explicit instruction to preserve GitHub/LinkedIn URLs, which AI models often strip by mistake.
*   **Keyword integration:** Instructions to naturally weave JD keywords into bullet points.

## 2. ATS Scoring Engine (Hybrid Approach)

**File:** `src/services/ats_scorer.py` & `src/models/prompts.py`
**Trigger:** `/api/score` (or part of `/api/generate`)

We use a **Hybrid Scoring System** that combines deterministic algorithmic checks with AI semantic evaluation.

### Algorithm (Code-based):
*   **Keyword Match (30%)**: Calculates the percentage of JD keywords present in the resume plain text.
*   **Section Completeness (20%)**: Checks for the existence of required headers (Summary, Education, Experience, etc.).
*   **Formatting (10%)**: Checks for parsing blockers like tables or columns (though our generator guarantees clean output).

### AI Evaluation (Gemini-based):
*   **Role Alignment (25%)**: AI evaluates how well the *narrative* of the resume fits the target role seniority and domain.
*   **Content Quality (15%)**: AI scores the usage of action verbs ("Engineered" vs "Worked on") and quantified metrics (e.g., "Reduced latency by 20%").

**Rationale:** purely AI scoring can be hallucinated or inconsistent. Pure algorithmic scoring misses context (e.g., "React.js" context vs just the word "React"). Combining them gives the most accurate "human recruiter + machine ATS" simulation.

## 3. Section Enhancement

**File:** `src/models/prompts.py` -> `SECTION_ENHANCEMENT_PROMPT`
**Trigger:** `/api/enhance`

This prompt is a focused "micro-editor". It takes a single string (e.g., a summary or a job description block) and rewrites it to be:
1.  **Concise:** Removes fluff.
2.  **Impactful:** Forces action-verb starts.
3.  **Keyword-Rich:** Injects keywords from the provided JD.

## 4. Chatbot Persona

**File:** `src/models/prompts.py` -> `CHATBOT_SYSTEM_PROMPT`
**Trigger:** `/api/chat`

The chatbot is instructed to be a "Recruiter-style Career Advisor".
*   **Tone:** Direct, professional, no fluff "motivational speaker" style.
*   **Capabilities:** analyzing JD gaps, suggesting specific projects to build, explaining why a score is low.
