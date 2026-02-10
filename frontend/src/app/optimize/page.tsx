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
import { parseResume, generateResume, downloadResume } from "@/lib/api";
import type { ResumeData, ATSScore } from "@/lib/types";
import { Upload, Sparkles, Loader2, FileDown, ArrowRight } from "lucide-react";

export default function OptimizePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
      setOptimized(res.resume_data);
      setOptimizedScore(res.ats_score);
    } catch (e: unknown) {
      alert("Optimization failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setOptimizing(false);
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
            rows={4}
            placeholder="Paste the target job description here (optional)..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <Button onClick={handleParse} disabled={!file || loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Parse Resume
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {original && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Original */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Original Resume</CardTitle>
              {originalScore && (
                <CardDescription>
                  ATS Score:{" "}
                  <span
                    className={`font-bold ${scoreColor(
                      originalScore.overall_score
                    )}`}
                  >
                    {originalScore.overall_score}/100
                  </span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{original.full_name}</p>
              <p className="text-muted-foreground">{original.summary}</p>
              <div className="flex flex-wrap gap-1">
                {original.skills.slice(0, 6).map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Optimized (or placeholder) */}
          <Card className={optimized ? "" : "opacity-60"}>
            <CardHeader>
              <CardTitle className="text-base">
                {optimized ? "Optimized Resume" : "Optimized (pending)"}
              </CardTitle>
              {optimizedScore && (
                <CardDescription>
                  ATS Score:{" "}
                  <span
                    className={`font-bold ${scoreColor(
                      optimizedScore.overall_score
                    )}`}
                  >
                    {optimizedScore.overall_score}/100
                  </span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {optimized ? (
                <>
                  <p className="font-medium">{optimized.full_name}</p>
                  <p className="text-muted-foreground">{optimized.summary}</p>
                  <div className="flex flex-wrap gap-1">
                    {optimized.skills.slice(0, 6).map((s) => (
                      <Badge key={s} variant="success">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Click &quot;Optimize&quot; to generate an improved version.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {original && (
        <div className="flex gap-3">
          <Button onClick={handleOptimize} disabled={optimizing}>
            {optimizing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Optimize with AI
          </Button>
          {(optimized || original) && (
            <>
              <Button
                variant="outline"
                onClick={() => handleDownload("pdf")}
                disabled={downloading}
              >
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload("docx")}
                disabled={downloading}
              >
                <FileDown className="mr-2 h-4 w-4" />
                DOCX
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
