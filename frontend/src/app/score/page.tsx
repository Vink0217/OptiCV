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
import { Progress } from "@/components/ui/progress";
import { scoreResume } from "@/lib/api";
import type { ATSScore, SkillGapAnalysis } from "@/lib/types";
import {
  Upload,
  BarChart3,
  Loader2,
  Target,
  FileText,
  Lightbulb,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const SCORE_LABELS: { key: keyof ATSScore; label: string }[] = [
  { key: "keyword_match", label: "Keyword Match" },
  { key: "section_completeness", label: "Section Completeness" },
  { key: "role_alignment", label: "Role Alignment" },
  { key: "formatting_score", label: "Formatting" },
  { key: "content_quality", label: "Content Quality" },
];

export default function ScorePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<ATSScore | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGapAnalysis | null>(null);

  const handleScore = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await scoreResume(file, jd || undefined);
      setScore(res.ats_score);
      setSkillGap(res.skill_gap);
    } catch (e: unknown) {
      alert("Scoring failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  const overallColor =
    (score?.overall_score ?? 0) >= 70
      ? "text-success"
      : (score?.overall_score ?? 0) >= 40
      ? "text-warning"
      : "text-destructive";

  const barColor = (v: number) =>
    v >= 70
      ? "bg-success"
      : v >= 40
      ? "bg-warning"
      : "bg-destructive";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ATS Score Analysis</h1>
        <p className="text-muted-foreground">
          Upload your resume to get a detailed ATS compatibility breakdown.
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
              {file ? file.name : "Click to upload your resume (PDF, DOCX, or TXT)"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Textarea
            rows={4}
            placeholder="Paste a job description for targeted analysis (optional)..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <Button onClick={handleScore} disabled={!file || loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Analyze Resume
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {score && (
        <>
          {/* Overall Score */}
          <Card>
            <CardContent className="flex items-center gap-8 py-8">
              <div className="flex flex-col items-center">
                <div className={`text-6xl font-bold ${overallColor}`}>
                  {score.overall_score}
                </div>
                <span className="mt-1 text-sm text-muted-foreground">
                  / 100
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {score.explanation}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SCORE_LABELS.map(({ key, label }) => {
              const val = score[key] as number;
              return (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{label}</span>
                      <span className={`text-sm font-bold ${barColor(val).replace("bg-", "text-")}`}>
                        {val}
                      </span>
                    </div>
                    <Progress value={val} indicatorClassName={barColor(val)} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Suggestions */}
          {score.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {score.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Missing Keywords */}
          {score.missing_keywords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-destructive" />
                  Missing Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {score.missing_keywords.map((kw) => (
                    <Badge key={kw} variant="destructive">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skill Gap */}
          {skillGap && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Matched Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skillGap.matched_skills.length > 0 ? (
                      skillGap.matched_skills.map((s) => (
                        <Badge key={s} variant="success">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No matched skills found.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Missing Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skillGap.missing_skills.length > 0 ? (
                      skillGap.missing_skills.map((s) => (
                        <Badge key={s} variant="warning">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No missing skills — great match!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
