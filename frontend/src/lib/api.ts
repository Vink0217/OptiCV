// ── API wrapper for OptiCV backend ──

const API_BASE = "/api";

async function checkedFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "<unreadable response>");
    console.error("API error", { url: input, status: res.status, statusText: res.statusText, body: text });
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }
  return res;
}

export async function generateResume(input: {
  full_name: string;
  phone: string;
  email: string;
  linkedin?: string;
  location?: string;
  target_role: string;
  job_description?: string;
  existing_resume_text?: string;
}) {
  const res = await checkedFetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function scoreResume(file: File, jobDescription?: string) {
  const form = new FormData();
  form.append("file", file);
  if (jobDescription) form.append("job_description", jobDescription);
  const res = await checkedFetch(`${API_BASE}/score`, { method: "POST", body: form });
  return res.json();
}

export async function parseResume(file: File, jobDescription?: string) {
  const form = new FormData();
  form.append("file", file);
  if (jobDescription) form.append("job_description", jobDescription);
  const res = await checkedFetch(`${API_BASE}/parse`, { method: "POST", body: form });
  return res.json();
}

export async function enhanceSection(
  sectionName: string,
  currentContent: string,
  targetRole: string,
  jobDescription?: string
) {
  const res = await checkedFetch(`${API_BASE}/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      section_name: sectionName,
      current_content: currentContent,
      target_role: targetRole,
      job_description: jobDescription,
    }),
  });
  return res.json();
}

export async function downloadResume(
  resumeData: Record<string, unknown>,
  format: "pdf" | "docx"
) {
  const res = await checkedFetch(`${API_BASE}/download?format=${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resumeData),
  });
  return res.blob();
}

export async function* chatStream(
  messages: { role: string; content: string }[],
  jobDescription?: string,
  resumeContext?: string
) {
  const res = await checkedFetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      job_description: jobDescription,
      resume_context: resumeContext,
    }),
  });
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
