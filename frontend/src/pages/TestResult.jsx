import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Check, X, Minus, Trophy, Clock } from "lucide-react";

export default function TestResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/attempts/${attemptId}`).then(({ data }) => setData(data));
  }, [attemptId]);

  if (!data) {
    return (
      <AppShell title="Loading result…">
        <div className="text-neutral-500">Crunching your score…</div>
      </AppShell>
    );
  }

  const { attempt, test } = data;
  const mm = Math.floor(attempt.timeTakenSec / 60);
  const ss = attempt.timeTakenSec % 60;
  const scoreColor =
    attempt.score >= 75 ? "#00C853" : attempt.score >= 50 ? "#FFBF00" : "#FF3366";

  return (
    <AppShell title="Test result" subtitle={test?.title}>
      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div
          className="lg:col-span-1 p-6 rounded-lg border border-[#262626] bg-[#121212] text-center"
          data-testid="result-score-card"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[#0066FF]/10 flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-[#0066FF]" />
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Your score</div>
          <div className="font-display font-bold text-6xl tabular-nums" style={{ color: scoreColor }}>
            {attempt.score}
            <span className="text-2xl text-neutral-500 ml-1">%</span>
          </div>
          <div className="mt-3 text-sm text-neutral-400">
            {attempt.correct} correct of {attempt.total}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <Clock className="w-3.5 h-3.5" /> Took {mm}m {ss}s
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          <div
            className="p-5 rounded-lg border border-[#00C853]/30 bg-[#00C853]/5"
            data-testid="result-correct-count"
          >
            <Check className="w-5 h-5 text-[#00C853] mb-3" />
            <div className="font-display text-3xl font-bold">{attempt.correct}</div>
            <div className="text-sm text-neutral-400 mt-1">Correct</div>
          </div>
          <div
            className="p-5 rounded-lg border border-[#FF3366]/30 bg-[#FF3366]/5"
            data-testid="result-wrong-count"
          >
            <X className="w-5 h-5 text-[#FF3366] mb-3" />
            <div className="font-display text-3xl font-bold">{attempt.wrong}</div>
            <div className="text-sm text-neutral-400 mt-1">Wrong</div>
          </div>
          <div
            className="p-5 rounded-lg border border-[#262626] bg-[#121212]"
            data-testid="result-skipped-count"
          >
            <Minus className="w-5 h-5 text-neutral-400 mb-3" />
            <div className="font-display text-3xl font-bold">{attempt.skipped}</div>
            <div className="text-sm text-neutral-400 mt-1">Skipped</div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Review answers</h2>
        <div className="space-y-4">
          {test?.questions?.map((q, i) => {
            const userAns = attempt.answers[i];
            const correctIdx = q.correctIndex;
            const isCorrect = userAns === correctIdx;
            const isSkipped = userAns === -1;
            return (
              <div
                key={q.id}
                className="p-5 rounded-lg border border-[#262626] bg-[#121212]"
                data-testid={`review-q-${i}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono ${
                      isSkipped
                        ? "bg-neutral-700/30 text-neutral-400"
                        : isCorrect
                        ? "bg-[#00C853]/20 text-[#00C853]"
                        : "bg-[#FF3366]/20 text-[#FF3366]"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="text-sm font-medium text-white">{q.question}</div>
                </div>
                <div className="space-y-2 pl-10">
                  {q.options.map((opt, oi) => {
                    const isCorrectOpt = oi === correctIdx;
                    const isUserOpt = oi === userAns;
                    return (
                      <div
                        key={oi}
                        className={`px-3 py-2 rounded-md text-sm border flex items-center gap-2 ${
                          isCorrectOpt
                            ? "border-[#00C853]/50 bg-[#00C853]/10 text-white"
                            : isUserOpt
                            ? "border-[#FF3366]/50 bg-[#FF3366]/10 text-white"
                            : "border-[#262626] text-neutral-400"
                        }`}
                      >
                        <span className="font-mono text-xs">{String.fromCharCode(65 + oi)}</span>
                        {opt}
                        {isCorrectOpt && <Check className="w-4 h-4 text-[#00C853] ml-auto" />}
                        {isUserOpt && !isCorrectOpt && <X className="w-4 h-4 text-[#FF3366] ml-auto" />}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="mt-3 pl-10 text-xs text-neutral-500 italic">
                    Why: {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => navigate(`/subjects/${attempt.subjectId}`)}
            data-testid="result-back-subject-btn"
            className="px-4 py-2 rounded-md bg-[#0066FF] hover:bg-[#0052CC] text-sm font-medium"
          >
            Back to subject
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            data-testid="result-dashboard-btn"
            className="px-4 py-2 rounded-md border border-[#262626] bg-[#121212] hover:border-[#404040] text-sm"
          >
            Dashboard
          </button>
        </div>
      </section>
    </AppShell>
  );
}
