// ── Shared TypeScript types for OptiCV ──

export interface ExperienceEntry {
  job_title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  responsibilities: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  location?: string;
  graduation_date: string;
  gpa?: string;
  relevant_coursework?: string[];
}

export interface ProjectEntry {
  title: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface ResumeData {
  full_name: string;
  phone: string;
  email: string;
  linkedin?: string;
  location?: string;
  target_role: string;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  certifications: string[];
}

export interface ATSScore {
  overall_score: number;
  keyword_match: number;
  section_completeness: number;
  role_alignment: number;
  formatting_score: number;
  content_quality: number;
  explanation: string;
  missing_keywords: string[];
  suggestions: string[];
}

export interface SkillGapAnalysis {
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ScoreResponse {
  ats_score: ATSScore;
  skill_gap: SkillGapAnalysis;
}

export interface GenerateResponse {
  resume_data: ResumeData;
  ats_score: ATSScore;
}

export interface ParseResponse {
  resume_data: ResumeData;
  ats_score: ATSScore;
}
