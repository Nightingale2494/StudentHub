import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Crown, Mail, Building2, GraduationCap, CalendarRange, Trophy, History } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    api.get("/attempts/me").then(({ data }) => setAttempts(data));
    api.get("/progress/me").then(({ data }) => setProgress(data));
  }, []);

  return (
    <AppShell title="Profile" subtitle="Your account & activity">
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <div
          className="p-6 rounded-lg border border-[#262626] bg-[#121212]"
          data-testid="profile-info-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-full bg-[#0066FF]/10 border border-[#0066FF]/40 flex items-center justify-center text-xl font-semibold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-display text-xl font-semibold">{user?.name}</div>
              <div className="text-sm text-neutral-500 capitalize">{user?.role}</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-neutral-300">
              <Mail className="w-4 h-4 text-neutral-500" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <Building2 className="w-4 h-4 text-neutral-500" />
              <span>{user?.college}</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <GraduationCap className="w-4 h-4 text-neutral-500" />
              <span>{user?.department}</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <CalendarRange className="w-4 h-4 text-neutral-500" />
              <span>Year {user?.year}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#262626]">
            {user?.isPremium ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-gradient-to-r from-[#B266FF]/15 to-[#0066FF]/15 border border-[#B266FF]/40">
                <Crown className="w-5 h-5 text-[#B266FF]" />
                <div>
                  <div className="text-sm font-medium text-white">Premium active</div>
                  <div className="text-xs text-neutral-400">
                    {user?.plan} · expires{" "}
                    {user?.expiryDate ? new Date(user.expiryDate).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate("/premium")}
                data-testid="profile-upgrade-btn"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-to-r from-[#B266FF] to-[#0066FF] hover:opacity-90 text-sm font-medium"
              >
                <Crown className="w-4 h-4" /> Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-5 rounded-lg border border-[#262626] bg-[#121212]" data-testid="profile-stat-tests">
              <div className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-2">Tests</div>
              <div className="font-display text-3xl font-semibold">{progress?.testsTaken ?? 0}</div>
            </div>
            <div className="p-5 rounded-lg border border-[#262626] bg-[#121212]" data-testid="profile-stat-avg">
              <div className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-2">Avg score</div>
              <div className="font-display text-3xl font-semibold">
                {progress?.averageScore ?? 0}
                <span className="text-lg text-neutral-500">%</span>
              </div>
            </div>
            <div className="p-5 rounded-lg border border-[#262626] bg-[#121212]" data-testid="profile-stat-subjects">
              <div className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-2">Subjects</div>
              <div className="font-display text-3xl font-semibold">
                {progress?.subjectsCovered ?? 0}
                <span className="text-lg text-neutral-500">/{progress?.totalSubjects ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-[#262626] bg-[#121212]">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-neutral-500" />
              <h3 className="font-display text-lg font-semibold">Recent attempts</h3>
            </div>
            {attempts.length === 0 ? (
              <div className="text-sm text-neutral-500 py-6 text-center">
                No attempts yet — take your first mock test from a subject.
              </div>
            ) : (
              <div className="space-y-2">
                {attempts.slice(0, 10).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/tests/result/${a.id}`)}
                    data-testid={`attempt-row-${a.id}`}
                    className="w-full text-left p-3 rounded-md border border-[#262626] bg-[#0A0A0A] hover:border-[#404040] transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">Attempt · {new Date(a.createdAt).toLocaleString()}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {a.correct}/{a.total} correct
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-neutral-500" />
                      <span
                        className="font-mono text-sm"
                        style={{
                          color: a.score >= 75 ? "#00C853" : a.score >= 50 ? "#FFBF00" : "#FF3366",
                        }}
                      >
                        {a.score}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
