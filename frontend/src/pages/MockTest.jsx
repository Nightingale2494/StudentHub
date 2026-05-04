import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api, formatApiError } from "@/lib/api";
import { Clock, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";

export default function MockTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/tests/${testId}`);
        setTest(data);
        setAnswers(new Array(data.questions.length).fill(-1));
        setSecondsLeft(data.duration * 60);
        startRef.current = Date.now();
      } catch (e) {
        toast.error(formatApiError(e));
        navigate(-1);
      }
    })();
  }, [testId, navigate]);

  useEffect(() => {
    if (!test) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          submit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  function setAnswer(idx) {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[current] = idx;
      return copy;
    });
  }

  async function submit(auto = false) {
    if (!test || submitting) return;
    setSubmitting(true);
    try {
      const timeTakenSec = Math.round((Date.now() - startRef.current) / 1000);
      const { data } = await api.post(`/tests/submit`, {
        testId: test.id,
        answers,
        timeTakenSec,
      });
      if (auto) toast.info("Time's up! Submitting your answers.");
      navigate(`/tests/result/${data.id}`, { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
      setSubmitting(false);
    }
  }

  if (!test) {
    return (
      <AppShell title="Loading test…">
        <div className="text-neutral-500">Preparing your test…</div>
      </AppShell>
    );
  }

  const q = test.questions[current];
  const answered = answers.filter((a) => a !== -1).length;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const lowTime = secondsLeft < 60;

  return (
    <AppShell title={test.title} subtitle={`${test.questions.length} questions · ${test.duration} min`}>
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Main question panel */}
        <div className="space-y-6">
          <div
            className={`flex items-center justify-between p-4 rounded-md border ${
              lowTime ? "border-[#FF3366] text-[#FF3366]" : "border-[#262626] text-white"
            } bg-[#121212] font-mono`}
            data-testid="test-timer"
          >
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Time remaining
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {mm}:{ss}
            </div>
          </div>

          <div className="p-6 bg-[#121212] border border-[#262626] rounded-lg" data-testid="test-question-card">
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
              Question {current + 1} of {test.questions.length}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-white mb-6 leading-snug">
              {q.question}
            </h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const selected = answers[current] === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswer(i)}
                    data-testid={`test-option-${i}`}
                    className={`w-full text-left px-4 py-3 rounded-md border transition-all flex items-center gap-3 ${
                      selected
                        ? "border-[#0066FF] bg-[#0066FF]/10 text-white"
                        : "border-[#262626] bg-[#0A0A0A] text-neutral-300 hover:border-[#404040] hover:text-white"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-mono ${
                        selected ? "border-[#0066FF] bg-[#0066FF] text-white" : "border-[#404040] text-neutral-400"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              data-testid="test-prev-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#262626] bg-[#121212] text-sm disabled:opacity-40 hover:border-[#404040]"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {current < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrent((c) => c + 1)}
                data-testid="test-next-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0066FF] hover:bg-[#0052CC] text-sm font-medium"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => submit(false)}
                disabled={submitting}
                data-testid="test-submit-btn"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[#00C853] hover:bg-[#00B74A] text-sm font-semibold disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {submitting ? "Submitting…" : "Submit test"}
              </button>
            )}
          </div>
        </div>

        {/* Side navigator */}
        <aside className="p-5 bg-[#121212] border border-[#262626] rounded-lg h-fit sticky top-24">
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Navigator</div>
          <div className="text-sm text-neutral-300 mb-4">
            Answered <span className="font-semibold text-white">{answered}</span> / {test.questions.length}
          </div>
          <div className="grid grid-cols-6 gap-2">
            {test.questions.map((_, i) => {
              const isCurrent = i === current;
              const isAnswered = answers[i] !== -1;
              return (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  data-testid={`test-nav-q-${i}`}
                  className={`h-9 rounded text-xs font-mono transition-colors ${
                    isCurrent
                      ? "bg-[#0066FF] text-white"
                      : isAnswered
                      ? "bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/40"
                      : "bg-[#0A0A0A] border border-[#262626] text-neutral-500 hover:border-[#404040]"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => submit(false)}
            disabled={submitting}
            data-testid="test-submit-sidebar-btn"
            className="mt-5 w-full px-4 py-2 rounded-md bg-[#00C853] hover:bg-[#00B74A] text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit now"}
          </button>
        </aside>
      </div>
    </AppShell>
  );
}
