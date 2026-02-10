"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReactDatePicker } from "@/components/ui/react-datepicker";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateResume, downloadResume, enhanceSection } from "@/lib/api";
import type { ResumeData, ATSScore } from "@/lib/types";
import {
  User,
  Briefcase,
  FileDown,
  Loader2,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Trash2,
  GraduationCap,
  FolderKanban,
  Building2,
} from "lucide-react";

// ── Optional section entry types ──
interface EduEntry {
  degree: string;
  institution: string;
  location: string;
  graduation_date: string;
  gpa: string;
}
interface ExpEntry {
  job_title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  responsibilities: string;
}
interface ProjEntry {
  title: string;
  description: string;
  technologies: string;
  link: string;
}

const emptyEdu = (): EduEntry => ({ degree: "", institution: "", location: "", graduation_date: "", gpa: "" });
const emptyExp = (): ExpEntry => ({ job_title: "", company: "", location: "", start_date: "", end_date: "", responsibilities: "" });
const emptyProj = (): ProjEntry => ({ title: "", description: "", technologies: "", link: "" });

/** Serialize optional sections into readable text for the LLM */
function buildExistingResumeText(
  education: EduEntry[],
  experience: ExpEntry[],
  projects: ProjEntry[]
): string | undefined {
  const parts: string[] = [];

  const filledEdu = education.filter((e) => e.degree || e.institution);
  if (filledEdu.length) {
    parts.push("EDUCATION:");
    filledEdu.forEach((e) => {
      parts.push(`- ${e.degree} from ${e.institution}${e.location ? `, ${e.location}` : ""}${e.graduation_date ? ` (${e.graduation_date})` : ""}${e.gpa ? ` — GPA: ${e.gpa}` : ""}`);
    });
  }

  const filledExp = experience.filter((e) => e.job_title || e.company);
  if (filledExp.length) {
    parts.push("\nEXPERIENCE:");
    filledExp.forEach((e) => {
      parts.push(`- ${e.job_title} at ${e.company}${e.location ? `, ${e.location}` : ""} | ${e.start_date || "N/A"} – ${e.end_date || "Present"}`);
      if (e.responsibilities.trim()) {
        e.responsibilities.split("\n").filter(Boolean).forEach((r) => parts.push(`  • ${r.trim()}`));
      }
    });
  }

  const filledProj = projects.filter((p) => p.title);
  if (filledProj.length) {
    parts.push("\nPROJECTS:");
    filledProj.forEach((p) => {
      parts.push(`- ${p.title}${p.link ? ` (${p.link})` : ""}`);
      if (p.description) parts.push(`  ${p.description}`);
      if (p.technologies.trim()) parts.push(`  Technologies: ${p.technologies}`);
    });
  }

  return parts.length ? parts.join("\n") : undefined;
}

type Step = 1 | 2 | 3;

export default function CreatePage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [enhancingSection, setEnhancingSection] = useState<string | null>(null);

  // Step 1 — required fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Step 1 — optional section toggles & data
  const [showEducation, setShowEducation] = useState(false);
  const [showExperience, setShowExperience] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [education, setEducation] = useState<EduEntry[]>([emptyEdu()]);
  const [experience, setExperience] = useState<ExpEntry[]>([emptyExp()]);
  const [projects, setProjects] = useState<ProjEntry[]>([emptyProj()]);

  // Load sample payload into the form (for testing)
  const loadSample = async () => {
    try {
      const res = await fetch('/test_payload.json');
      if (!res.ok) throw new Error(`Failed to load sample: ${res.status}`);
      const sample = await res.json();
      setFullName(sample.full_name ?? '');
      setPhone(sample.phone ?? '');
      setEmail(sample.email ?? '');
      setTargetRole(sample.target_role ?? '');
      if (sample.experience) {
        setExperience(sample.experience.map((ex: any) => ({
          job_title: ex.job_title || '',
          company: ex.company || '',
          location: ex.location || '',
          start_date: ex.start_date || '',
          end_date: ex.end_date || '',
          responsibilities: (ex.responsibilities || []).join('\n'),
        })));
        setShowExperience(true);
      }
      if (sample.education) {
        setEducation(sample.education.map((ed: any) => ({
          degree: ed.degree || '',
          institution: ed.institution || '',
          location: ed.location || '',
          graduation_date: ed.graduation_date || '',
          gpa: ed.gpa || '',
        })));
        setShowEducation(true);
      }
      if (sample.projects) {
        setProjects(sample.projects.map((p: any) => ({
          title: p.title || '',
          description: p.description || '',
          technologies: (p.technologies || []).join(', '),
          link: p.link || '',
        })));
        setShowProjects(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load sample payload: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  

  // Step 2+3 data
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [atsScore, setAtsScore] = useState<ATSScore | null>(null);

  // Editable fields (step 2)
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [downloading, setDownloading] = useState(false);

  // ── Array helpers ──
  const updateEdu = (i: number, field: keyof EduEntry, value: string) =>
    setEducation((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  const updateExp = (i: number, field: keyof ExpEntry, value: string) => {
    // Basic update first to get the provisional state
    // But actually, we should just branch logic based on field type
    
    // Date validation specific branch
    if (field === "start_date" || field === "end_date") {
      setExperience(prev => {
        const newData = [...prev];
        const entry = { ...newData[i], [field]: value };
        
        if (entry.start_date && entry.end_date && entry.end_date.toLowerCase() !== "present") {
          const parseDate = (d: string) => {
            const parts = d.split(/[-/]/);
            if (parts.length === 2 && parts[0] && parts[1]) {
               try {
                 return new Date(parseInt(parts[1]), parseInt(parts[0]) - 1);
               } catch { return null; }
            }
            return null;
          };
          
          const start = parseDate(entry.start_date);
          const end = parseDate(entry.end_date);
          
          if (start && end && start > end) {
            alert("Start date cannot be after end date.");
            // Revert by not returning new state, or return prev
            // Returning prev means usage of 'value' is ignored, which prevents the invalid feedback
            return prev; 
          }
        }
        newData[i] = entry;
        return newData;
      });
    } else {
       // Standard update for non-date fields
       setExperience((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
    }
  };
  const updateProj = (i: number, field: keyof ProjEntry, value: string) =>
    setProjects((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const existingText = buildExistingResumeText(education, experience, projects);
      const res = await generateResume({
        full_name: fullName,
        phone,
        email,
        target_role: targetRole,
        job_description: jobDescription || undefined,
        existing_resume_text: existingText,
      });
      const rd: ResumeData = res.resume_data;
      setResumeData(rd);
      setAtsScore(res.ats_score);
      setSummary(rd.summary);
      setSkills(rd.skills.join("\n"));
      setStep(2);
    } catch (e: unknown) {
      alert("Generation failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async (section: string, content: string) => {
    setEnhancingSection(section);
    try {
      const res = await enhanceSection(
        section,
        content,
        targetRole,
        jobDescription || undefined
      );
      if (section === "summary") setSummary(res.enhanced_content);
      if (section === "skills") setSkills(res.enhanced_content);
    } catch {
      // silently fail
    } finally {
      setEnhancingSection(null);
    }
  };

  const handleDownload = async (format: "pdf" | "docx") => {
    if (!resumeData) return;
    setDownloading(true);
    try {
      const updated = {
        ...resumeData,
        summary,
        skills: skills.split("\n").filter(Boolean),
      };
      const blob = await downloadResume(updated, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fullName.replace(/\s+/g, "_")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert("Download failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setDownloading(false);
    }
  };

  const scoreColor =
    (atsScore?.overall_score ?? 0) >= 70
      ? "text-success"
      : (atsScore?.overall_score ?? 0) >= 40
      ? "text-warning"
      : "text-destructive";

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step >= s
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            <span
              className={`text-sm ${
                step >= s ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s === 1 ? "Details" : s === 2 ? "Review & Edit" : "Download"}
            </span>
            {s < 3 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Basic Info ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Your Details
            </CardTitle>
            <CardDescription>
              Enter your information and optionally paste a job description for
              targeted optimization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="secondary" onClick={loadSample}>
                Load Sample
              </Button>
              <div className="ml-auto text-sm text-muted-foreground">Sample payload loader</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Full Name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Role *</label>
                <Input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Your Target Role"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone *</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your Phone Number"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Job Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                rows={6}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here to optimize your resume for it..."
              />
            </div>

            {/* ── Optional Sections ── */}
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">
                Add your background details below so the AI can build a more accurate resume.
                All sections are optional — leave them blank and the AI will generate content based on your target role.
              </p>

              {/* ─ Education ─ */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setShowEducation(!showEducation)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Education
                    {education.some((e) => e.degree || e.institution) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {education.filter((e) => e.degree || e.institution).length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showEducation ? "rotate-180" : ""}`} />
                </button>
                {showEducation && (
                  <div className="space-y-4 border-t border-border px-4 py-4">
                    {education.map((edu, i) => (
                      <div key={i} className="relative space-y-3 rounded-lg border border-border/60 bg-secondary/20 p-4">
                        {education.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEducation((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Degree / Field of Study</label>
                            <Input value={edu.degree} onChange={(e) => updateEdu(i, "degree", e.target.value)} placeholder="B.Tech Computer Science" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Institution</label>
                            <Input value={edu.institution} onChange={(e) => updateEdu(i, "institution", e.target.value)} placeholder="University Name" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Location</label>
                            <Input value={edu.location} onChange={(e) => updateEdu(i, "location", e.target.value)} placeholder="City, State" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Graduation Date</label>
                            <ReactDatePicker value={edu.graduation_date} onChange={val => updateEdu(i, "graduation_date", val)} placeholder="Select date" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">GPA (optional)</label>
                            <Input value={edu.gpa} onChange={(e) => updateEdu(i, "gpa", e.target.value)} placeholder="Your Current GPA" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setEducation((prev) => [...prev, emptyEdu()])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Education
                    </Button>
                  </div>
                )}
              </div>

              {/* ─ Work Experience / Internships ─ */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setShowExperience(!showExperience)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Work Experience / Internships
                    {experience.some((e) => e.job_title || e.company) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {experience.filter((e) => e.job_title || e.company).length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showExperience ? "rotate-180" : ""}`} />
                </button>
                {showExperience && (
                  <div className="space-y-4 border-t border-border px-4 py-4">
                    {experience.map((exp, i) => (
                      <div key={i} className="relative space-y-3 rounded-lg border border-border/60 bg-secondary/20 p-4">
                        {experience.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setExperience((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Job Title / Role</label>
                            <Input value={exp.job_title} onChange={(e) => updateExp(i, "job_title", e.target.value)} placeholder="Your Position" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Company</label>
                            <Input value={exp.company} onChange={(e) => updateExp(i, "company", e.target.value)} placeholder="Company Name" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Location</label>
                            <Input value={exp.location} onChange={(e) => updateExp(i, "location", e.target.value)} placeholder="City, State" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Start Date</label>
                              <ReactDatePicker value={exp.start_date} onChange={val => updateExp(i, "start_date", val)} placeholder="Select date" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">End Date</label>
                              <ReactDatePicker value={exp.end_date} onChange={val => updateExp(i, "end_date", val)} placeholder="Select date or Present" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Responsibilities / Achievements (one per line)</label>
                          <Textarea
                            rows={3}
                            value={exp.responsibilities}
                            onChange={(e) => updateExp(i, "responsibilities", e.target.value)}
                            placeholder={"Your key responsibilities and achievements in this role."}
                          />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setExperience((prev) => [...prev, emptyExp()])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Experience
                    </Button>
                  </div>
                )}
              </div>

              {/* ─ Projects ─ */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setShowProjects(!showProjects)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    Projects
                    {projects.some((p) => p.title) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {projects.filter((p) => p.title).length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showProjects ? "rotate-180" : ""}`} />
                </button>
                {showProjects && (
                  <div className="space-y-4 border-t border-border px-4 py-4">
                    {projects.map((proj, i) => (
                      <div key={i} className="relative space-y-3 rounded-lg border border-border/60 bg-secondary/20 p-4">
                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setProjects((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Project Title</label>
                            <Input value={proj.title} onChange={(e) => updateProj(i, "title", e.target.value)} placeholder="Project Name" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Link (optional)</label>
                            <Input value={proj.link} onChange={(e) => updateProj(i, "link", e.target.value)} placeholder="https://github.com/..." />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Description</label>
                          <Textarea rows={2} value={proj.description} onChange={(e) => updateProj(i, "description", e.target.value)} placeholder="Briefly describe the project" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Technologies (comma-separated)</label>
                          <Input value={proj.technologies} onChange={(e) => updateProj(i, "technologies", e.target.value)} placeholder="Skills used, e.g., React, Python" />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setProjects((prev) => [...prev, emptyProj()])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Project
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={
                  loading || !fullName || !email || !phone || !targetRole
                }
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Resume
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Review & Edit ── */}
      {step === 2 && resumeData && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Review & Edit
              </CardTitle>
              <CardDescription>
                Edit sections below. Use &quot;Enhance&quot; to improve any section
                with AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Summary</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEnhance("summary", summary)}
                    disabled={enhancingSection === "summary"}
                  >
                    {enhancingSection === "summary" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    Enhance
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">
                    Skills{" "}
                    <span className="text-muted-foreground font-normal">
                      (one per line)
                    </span>
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEnhance("skills", skills)}
                    disabled={enhancingSection === "skills"}
                  >
                    {enhancingSection === "skills" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    Enhance
                  </Button>
                </div>
                <Textarea
                  rows={5}
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
              </div>

              {/* Experience (read-only preview) */}
              {resumeData.experience.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Experience</label>
                  {resumeData.experience.map((exp, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border p-3 text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {exp.job_title} @ {exp.company}
                        </span>
                        <span className="text-muted-foreground">
                          {exp.start_date} – {exp.end_date || "Present"}
                        </span>
                      </div>
                      <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                        {exp.responsibilities.map((r, j) => (
                          <li key={j}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {resumeData.projects.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Projects</label>
                  {resumeData.projects.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border p-3 text-sm"
                    >
                      <span className="font-medium">{p.title}</span>
                      <p className="mt-0.5 text-muted-foreground">
                        {p.description}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.technologies.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Score & Download ── */}
      {step === 3 && resumeData && (
        <div className="space-y-4">
          {atsScore && (
            <Card>
              <CardHeader>
                <CardTitle>ATS Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div
                    className={`text-5xl font-bold ${scoreColor}`}
                  >
                    {atsScore.overall_score}
                  </div>
                  <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                    <p>{atsScore.explanation}</p>
                  </div>
                </div>
                {atsScore.suggestions.length > 0 && (
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {atsScore.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5 text-primary" />
                Download
              </CardTitle>
              <CardDescription>
                Download your resume as PDF or DOCX.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => handleDownload("pdf")} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload("docx")}
                disabled={downloading}
              >
                Download DOCX
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Edit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
