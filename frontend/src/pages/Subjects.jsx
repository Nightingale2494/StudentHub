import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/subjects").then(({ data }) => setSubjects(data));
  }, []);

  return (
    <AppShell title="Subjects" subtitle="Papers, notes and mock tests — grouped by subject">
      {subjects.length === 0 ? (
        <div className="p-10 text-center text-neutral-500 border border-dashed border-[#262626] rounded-lg">
          No subjects yet for your year and department.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/subjects/${s.id}`)}
              data-testid={`subjects-page-card-${s.id}`}
              className="group text-left p-6 bg-[#121212] border border-[#262626] rounded-lg hover:border-[#404040] hover:-translate-y-0.5 transition-all"
            >
              <div
                className="w-10 h-10 rounded-md mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${s.color || "#0066FF"}20`, color: s.color || "#0066FF" }}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono uppercase text-neutral-500 mb-1">{s.code}</div>
              <h3 className="font-display text-lg font-semibold mb-2">{s.name}</h3>
              {s.description && <p className="text-sm text-neutral-400 line-clamp-2 mb-4">{s.description}</p>}
              <div className="flex items-center gap-1 text-sm text-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
