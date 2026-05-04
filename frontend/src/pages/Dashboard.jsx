import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { BookOpen, FlaskConical, TrendingUp, Target, ArrowRight, Crown } from "lucide-react";

function StatCard({ icon: Icon, label, value, suffix, testId }) {
  return (
    <div
      className="p-5 bg-[#121212] border border-[#262626] rounded-lg hover:border-[#404040] transition-colors"
      data-testid={testId}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-neutral-500 mb-3">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="font-display text-3xl font-semibold text-white">
        {value}
        {suffix && <span className="text-lg text-neutral-500 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function SubjectCard({ subject, onClick }) {
  return (
    <button
      onClick={onClick}
      data-testid={`subject-card-${subject.id}`}
      className="group text-left p-6 bg-[#121212] border border-[#262626] rounded-lg hover:border-[#404040] hover:-translate-y-0.5 transition-all"
    >
      <div
        className="w-10 h-10 rounded-md mb-4 flex items-center justify-center"
        style={{ backgroundColor: `${subject.color || "#0066FF"}20`, color: subject.color || "#0066FF" }}
      >
        <BookOpen className="w-5 h-5" />
      </div>
      <div className="text-xs font-mono uppercase text-neutral-500 mb-1">{subject.code}</div>
      <h3 className="font-display text-lg font-semibold mb-2 text-white">{subject.name}</h3>
      {subject.description && (
        <p className="text-sm text-neutral-400 line-clamp-2 mb-4">{subject.description}</p>
      )}
      <div className="flex items-center gap-1 text-sm text-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    api.get("/subjects").then(({ data }) => setSubjects(data));
    api.get("/progress/me").then(({ data }) => setProgress(data));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell
      title={`${greeting}, ${user?.name?.split(" ")[0]}`}
      subtitle={`${user?.department || ""} · Year ${user?.year || ""} · ${user?.college || ""}`}
    >
      {/* Premium banner */}
      {!user?.isPremium && (
        <div
          className="mb-8 p-5 rounded-lg border border-[#B266FF]/40 bg-gradient-to-r from-[#1a0f2a] to-[#121212] flex flex-wrap items-center justify-between gap-4"
          data-testid="dashboard-premium-banner"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#B266FF] to-[#0066FF] flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-semibold text-white">Unlock all previous year papers</div>
              <div className="text-sm text-neutral-400">Access 100+ important questions &amp; premium mock tests.</div>
            </div>
          </div>
          <button
            onClick={() => navigate("/premium")}
            data-testid="dashboard-go-premium-btn"
            className="px-5 py-2.5 rounded-md font-medium bg-gradient-to-r from-[#B266FF] to-[#0066FF] hover:opacity-90 transition-opacity text-sm"
          >
            Go premium — ₹49/mo
          </button>
        </div>
      )}

      {/* Progress stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          icon={FlaskConical}
          label="Tests taken"
          value={progress?.testsTaken ?? 0}
          testId="stat-tests-taken"
        />
        <StatCard
          icon={TrendingUp}
          label="Average score"
          value={progress?.averageScore ?? 0}
          suffix="%"
          testId="stat-avg-score"
        />
        <StatCard
          icon={Target}
          label="Subjects covered"
          value={`${progress?.subjectsCovered ?? 0}/${progress?.totalSubjects ?? 0}`}
          testId="stat-subjects-covered"
        />
        <StatCard
          icon={BookOpen}
          label="Your subjects"
          value={subjects.length}
          testId="stat-total-subjects"
        />
      </section>

      {/* Subjects */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-1">
              Your subjects
            </div>
            <h2 className="font-display text-2xl font-semibold">Year {user?.year} · {user?.department}</h2>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div
            className="p-10 bg-[#121212] border border-[#262626] rounded-lg text-center text-neutral-400"
            data-testid="dashboard-no-subjects"
          >
            No subjects configured for your year yet. Ask an admin to add some!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((s) => (
              <SubjectCard key={s.id} subject={s} onClick={() => navigate(`/subjects/${s.id}`)} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
