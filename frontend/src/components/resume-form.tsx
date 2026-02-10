import React, { useState } from "react";
import type { ResumeData } from "../lib/types";

function emptyResume(): ResumeData {
  return {
    full_name: "",
    phone: "",
    email: "",
    target_role: "",
    summary: "",
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };
}

export default function ResumeForm() {
  const [data, setData] = useState<ResumeData>(() => emptyResume());

  function onChangeTextarea(e: React.ChangeEvent<HTMLTextAreaElement>) {
    try {
      const parsed = JSON.parse(e.target.value);
      setData(parsed);
    } catch {
      // ignore invalid JSON while typing
    }
  }

  const loadSample = async () => {
    try {
      const res = await fetch("/test_payload.json");
      if (!res.ok) throw new Error(`Failed to load sample: ${res.status}`);
      const sample = await res.json();
      setData({
        full_name: sample.full_name ?? "",
        phone: sample.phone ?? "",
        email: sample.email ?? "",
        target_role: sample.target_role ?? "",
        summary: sample.summary ?? "",
        skills: sample.skills ?? [],
        experience: sample.experience ?? [],
        education: sample.education ?? [],
        projects: sample.projects ?? [],
        certifications: sample.certifications ?? [],
      });
    } catch (e) {
      console.error(e);
      alert("Failed to load sample payload: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const clear = () => setData(emptyResume());

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <button type="button" onClick={loadSample} className="btn">
          Load Sample
        </button>
        <button type="button" onClick={clear} className="btn">
          Clear
        </button>
      </div>

      <label className="block text-sm font-medium mb-2">Raw Resume JSON (edit to update)</label>
      <textarea
        className="w-full h-64 p-2 border rounded"
        value={JSON.stringify(data, null, 2)}
        onChange={onChangeTextarea}
      />
    </div>
  );
}
