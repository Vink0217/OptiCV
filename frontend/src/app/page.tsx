import Link from "next/link";
import { FileText, BarChart3, Sparkles, MessageSquare } from "lucide-react";

const features = [
  {
    href: "/create",
    icon: FileText,
    title: "Create Resume",
    description: "Build an ATS-optimized resume from scratch with AI assistance.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    href: "/optimize",
    icon: Sparkles,
    title: "Optimize Existing",
    description: "Upload your resume and let AI re-optimize it for a specific job.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    href: "/score",
    icon: BarChart3,
    title: "ATS Score",
    description: "Get a detailed ATS compatibility score with actionable suggestions.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    href: "/chat",
    icon: MessageSquare,
    title: "AI Coach",
    description: "Chat with an AI career advisor for resume and job search tips.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        AI-Powered Resume Builder
      </div>
      <h1 className="mt-4 text-center text-4xl font-bold tracking-tight sm:text-5xl">
        Build resumes that{" "}
        <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          beat the ATS
        </span>
      </h1>
      <p className="mt-4 max-w-lg text-center text-muted-foreground">
        OptiCV uses hybrid AI + algorithmic scoring to create, optimize, and
        analyze resumes for maximum ATS compatibility.
      </p>

      <div className="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {features.map(({ href, icon: Icon, title, description, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className={`mb-3 inline-flex rounded-lg p-2.5 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
