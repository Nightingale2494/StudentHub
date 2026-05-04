import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Play, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [subjects, setSubjects] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: subs } = await api.get("/subjects");
      const subMap = Object.fromEntries(subs.map((s) => [s.id, s]));
      setSubjects(subMap);
      const all = [];
      await Promise.all(
        subs.map(async (s) => {
          const { data } = await api.get(`/subjects/${s.id}/tests`);
          all.push(...data);
        })
      );
      setTests(all);
    })();
  }, []);

  return (
    <AppShell title="Mock Tests" subtitle="Practise under exam conditions">
      {tests.length === 0 ? (
        <div className="p-10 text-center text-neutral-500 border border-dashed border-[#262626] rounded-lg">
          No mock tests yet for your subjects.
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => {
            const locked = t.isPremium && !user?.isPremium;
            return (
              <div
                key={t.id}
                className="p-4 rounded-md border border-[#262626] bg-[#121212] hover:border-[#404040] transition-colors flex items-center justify-between"
                data-testid={`tests-row-${t.id}`}
              >
                <div>
                  <div className="text-xs font-mono uppercase text-neutral-500 mb-0.5">
                    {subjects[t.subjectId]?.code}
                  </div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-[#00E5FF]" />
                    {t.title}
                    {t.isPremium && (
                      <span className="text-[10px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded border border-[#B266FF]/40 text-[#B266FF]">
                        Premium
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {t.questions?.length || 0} questions · {t.duration} min
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (locked) return navigate("/premium");
                    navigate(`/tests/${t.id}`);
                  }}
                  data-testid={`tests-start-btn-${t.id}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    locked
                      ? "bg-gradient-to-r from-[#B266FF] to-[#0066FF] text-white hover:opacity-90"
                      : "bg-[#0066FF] text-white hover:bg-[#0052CC]"
                  }`}
                >
                  {locked ? <Crown className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {locked ? "Unlock" : "Start"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
