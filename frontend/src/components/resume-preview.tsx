import { ResumeData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ResumePreviewProps {
  data: ResumeData;
  className?: string;
  // Overrides for live editing
  summaryOverride?: string;
  skillsOverride?: string[];
}

export default function ResumePreview({ data, className, summaryOverride, skillsOverride }: ResumePreviewProps) {
  // Use overrides if provided, else fall back to data
  const summary = summaryOverride !== undefined ? summaryOverride : data.summary;
  const skillsList = skillsOverride !== undefined ? skillsOverride : data.skills;

  return (
    <div 
      id="resume-preview-id"
      className={cn("bg-white text-black shadow-lg mx-auto font-serif leading-normal box-border", className)}
      style={{
        width: "215.9mm",      // Exact US Letter Width
        minHeight: "279.4mm",  // Exact US Letter Height
        paddingTop: "15mm",    // Matches PDF t_margin
        paddingBottom: "15mm", // Matches PDF margins
        paddingLeft: "19mm",   // Matches PDF L_MARGIN
        paddingRight: "19mm",  // Matches PDF R_MARGIN
        fontSize: "10.5pt",    // Base font size
        fontFamily: '"Times New Roman", Times, serif'
      }}
    >
      {/* Name */}
      <h1 className="text-[18pt] font-bold text-center uppercase mb-1">{data.full_name}</h1>
      
      {/* Contact Info */}
      <div className="text-center mb-4">
        <span>{data.phone}</span>
        {data.email && <span> | {data.email}</span>}
        {data.linkedin && (
           <span> | <a href={data.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline">LinkedIn</a></span>
        )}
        {data.location && <span> | {data.location}</span>}
      </div>

      {/* Summary */}
      {summary && (
        <section className="mb-4">
          <h2 className="text-[10.5pt] font-bold uppercase border-b border-black mb-1">Summary</h2>
          <p>{summary}</p>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[10.5pt] font-bold uppercase border-b border-black mb-1">Experience</h2>
          <div className="space-y-3">
            {data.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">{exp.company}</span>
                  <span className="font-bold text-right">{exp.location}</span>
                </div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="italic">{exp.job_title}</span>
                  <span className="italic text-right">
                    {exp.start_date} – {exp.end_date || "Present"}
                  </span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {exp.responsibilities.map((r, idx) => (
                    <li key={idx} className="pl-1">{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[10.5pt] font-bold uppercase border-b border-black mb-1">Projects</h2>
          <div className="space-y-3">
            {data.projects.map((proj, i) => {
               // Logic for GitHub Link display
               const hasLink = proj.link && (proj.link.startsWith("http"));
               const techs = (proj.technologies || []).join(", ");
               
               return (
                <div key={i}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold">{proj.title}</span>
                    {hasLink && (
                      <a 
                        href={proj.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-600 font-bold underline text-[9.5pt]"
                      >
                        GitHub Link
                      </a>
                    )}
                  </div>
                  {techs && (
                    <div className="italic mb-1">Technologies: {techs}</div>
                  )}
                  {proj.description && (
                     <ul className="list-disc pl-5 space-y-0.5">
                        <li className="pl-1">{proj.description}</li>
                     </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Skills */}
      {skillsList && skillsList.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[10.5pt] font-bold uppercase border-b border-black mb-1">Skills</h2>
          <ul className="list-disc pl-5 space-y-0.5">
            {skillsList.map((skill, i) => {
              // Strip existing bullets if the data has them (legacy data)
              const cleanSkill = skill.replace(/^[•●-]\s*/, "");
              return <li key={i} className="pl-1">{cleanSkill}</li>;
            })}
          </ul>
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[10.5pt] font-bold uppercase border-b border-black mb-1">Education</h2>
          <div className="space-y-2">
            {data.education.map((edu, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">{edu.institution}</span>
                  <span className="font-bold text-right">{edu.location}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="italic">{edu.degree}</span>
                  <span className="italic text-right">{edu.graduation_date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications (Optional) */}
      {data.certifications && data.certifications.length > 0 && (
         <section className="mb-4">
            <h2 className="text-[10.5pt] font-bold uppercase border-b border-black mb-1">Certifications</h2>
             <ul className="list-disc pl-5 space-y-0.5">
              {data.certifications.map((cert, i) => (
                <li key={i} className="pl-1">{cert}</li>
              ))}
            </ul>
         </section>
      )}
    </div>
  );
}
