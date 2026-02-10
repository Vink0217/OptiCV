"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseResume, generateResume, downloadResume, enhanceSection } from "@/lib/api";
import type { ResumeData, ATSScore } from "@/lib/types";
import { Upload, Sparkles, Loader2, FileDown, ArrowRight, Eye, Edit2 } from "lucide-react";
import ResumePreview from "@/components/resume-preview";
import { Input } from "@/components/ui/input";

export default function OptimizePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Edit Mode
  const [enhancingSection, setEnhancingSection] = useState<string | null>(null);

  const [original, setOriginal] = useState<ResumeData | null>(null);
  const [originalScore, setOriginalScore] = useState<ATSScore | null>(null);
  const [optimized, setOptimized] = useState<ResumeData | null>(null);
  const [optimizedScore, setOptimizedScore] = useState<ATSScore | null>(null);

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await parseResume(file, jd || undefined);
      setOriginal(res.resume_data);
      setOriginalScore(res.ats_score);
    } catch (e: unknown) {
      alert("Parse failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!original) return;
    setOptimizing(true);
    try {
      const res = await generateResume({
        full_name: original.full_name,
        phone: original.phone,
        email: original.email,
        target_role: original.target_role,
        job_description: jd || undefined,
        existing_resume_text: JSON.stringify(original),
      });
      // Merge back any missing hyperlinks or contact fields from the original
      const merged = { ...res.resume_data } as any;
      // Preserve contact fields if model omitted or changed them
      merged.linkedin = merged.linkedin || original.linkedin || "";
      merged.location = merged.location || original.location || "";

      // Merge project links: match by title (best-effort)
      if (original.projects && merged.projects) {
        const byTitle = new Map<string, any>();
        original.projects.forEach((p: any) => { if (p.title) byTitle.set(p.title.toLowerCase(), p); });
        merged.projects = merged.projects.map((p: any) => {
          if (!p) return p;
          const key = (p.title || "").toLowerCase();
          const orig = byTitle.get(key);
          if (orig && !p.link && orig.link) p.link = orig.link;
          return p;
        });
      }

      setOptimized(merged);
      setOptimizedScore(res.ats_score);
    } catch (e: unknown) {
      alert("Optimization failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setOptimizing(false);
    }
  };

  const handleEnhance = async (section: string, content: string) => {
    if (!original) return;
    setEnhancingSection(section);
    try {
      const res = await enhanceSection(section, content, original.target_role, jd || undefined);
      if (!optimized) return;
      const updated = { ...optimized } as any;
      if (section === "summary") updated.summary = res.enhanced_content;
      if (section === "skills") updated.skills = (res.enhanced_content || "").split("\n").filter(Boolean);
      setOptimized(updated);
    } catch (e) {
      console.error(e);
      alert("Enhancement failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setEnhancingSection(null);
    }
  };

  const handleDownload = async (format: "pdf" | "docx") => {
    const data = optimized || original;
    if (!data) return;
    setDownloading(true);
    try {
      const blob = await downloadResume(data as unknown as Record<string, unknown>, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.full_name.replace(/\s+/g, "_")}_optimized.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert("Download failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setDownloading(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 70 ? "text-success" : s >= 40 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Optimize Existing Resume</h1>
        <p className="text-muted-foreground">
          Upload your resume and a job description to get an AI-optimized
          version.
        </p>
      </div>

      {/* Upload */}
      {!original ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/40"
            >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Click to upload your resume (PDF or DOCX)"}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
            </div>
            <Textarea
              rows={6}
              placeholder="Paste job description (optional)"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
            <Button onClick={handleParse} disabled={loading || !file} className="w-full">
               {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               Upload & Analyze
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
           <div className="flex justify-between items-center mb-4">
             <Button variant="outline" onClick={() => { setOriginal(null); setOptimized(null); }}>
               Upload New
             </Button>
             
             {!optimized && (
                <Button onClick={handleOptimize} disabled={optimizing}>
                   {optimizing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                   )}
                   Optimize with AI
                </Button>
             )}
             
             {optimized && (
               <div className="flex gap-2">
                 <Button variant="outline" onClick={() => handleDownload("pdf")} disabled={downloading}>
                    <FileDown className="mr-2 h-4 w-4" /> PDF
                 </Button>
                 <Button variant="outline" onClick={() => handleDownload("docx")} disabled={downloading}>
                    <FileDown className="mr-2 h-4 w-4" /> DOCX
                 </Button>
               </div>
             )}
           </div>

           {!optimized ? (
               <div className="max-w-4xl mx-auto">
                   <Card>
                     <CardHeader>
                       <CardTitle>Resume Analysis</CardTitle>
                       {originalScore && (
                         <CardDescription className={scoreColor(originalScore.overall_score) + " font-bold"}>
                           Score: {originalScore.overall_score}/100
                         </CardDescription>
                       )}
                     </CardHeader>
                     <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <strong className="block text-base">Current Summary</strong>
                                <div className="p-3 bg-secondary/20 rounded-md text-muted-foreground whitespace-pre-wrap">
                                    {original.summary || "No summary detected."}
                                </div>
                            </div>
                            <div className="space-y-2">
                               <strong className="block text-base">Detected Skills</strong>
                               <div className="flex flex-wrap gap-1">
                                  {original.skills.length ? original.skills.slice(0, 30).map(s => <Badge key={s} variant="outline">{s}</Badge>) : <span className="text-muted-foreground">No skills detected.</span>}
                               </div>
                            </div>
                        </div>
                     </CardContent>
                   </Card>
               </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                   <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2">
                          <Edit2 className="h-5 w-5"/> Edit & Enhance
                       </CardTitle>
                       <CardDescription>
                          Review and refine the AI suggestions.
                       </CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold">Summary</label>
                            <Button
                              size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => handleEnhance("summary", optimized.summary)}
                              disabled={enhancingSection === "summary"}
                            >
                              {enhancingSection === "summary" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                              Enhance
                            </Button>
                          </div>
                          <Textarea
                            rows={6}
                            value={optimized.summary}
                            onChange={(e) => setOptimized({...optimized, summary: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold">Skills <span className="text-xs font-normal text-muted-foreground">(one per line)</span></label>
                            <Button
                              size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => handleEnhance("skills", (optimized.skills || []).join('\n'))}
                              disabled={enhancingSection === "skills"}
                            >
                               {enhancingSection === "skills" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                               Enhance
                            </Button>
                          </div>
                          <Textarea
                             rows={8}
                             value={(optimized.skills || []).join('\n')}
                             onChange={(e) => setOptimized({...optimized, skills: e.target.value.split('\n')})}
                          />
                        </div>
                     </CardContent>
                   </Card>
                   
                   {optimizedScore && (
                     <Card>
                       <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
                       <CardContent>
                         <div className={`text-4xl font-bold ${scoreColor(optimizedScore.overall_score)} mb-2`}>
                            {optimizedScore.overall_score}/100
                         </div>
                         <p className="text-sm text-muted-foreground">{optimizedScore.explanation}</p>
                       </CardContent>
                     </Card>
                   )}
                </div>

                <div className="lg:sticky lg:top-4 h-fit">
                    <div className="bg-gray-100/50 rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-inner">
                        <div className="p-3 border-b bg-white/50 backdrop-blur flex justify-between items-center">
                           <span className="font-semibold text-sm text-gray-600 flex items-center gap-2">
                             <Eye className="h-4 w-4"/> Live Preview
                           </span>
                        </div>
                        <div className="p-4 flex justify-center bg-gray-50/50 min-h-[500px]">
                            <ResumePreview 
                                data={optimized} 
                                className="origin-top scale-[0.55] sm:scale-[0.65] lg:scale-[0.70] shadow-2xl"
                            />
                        </div>
                    </div>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
