import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  BookOpen,
  FlaskConical,
  Search,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Subject-wise library",
      desc: "All your CA, PCA, semester papers and important questions in one place — filtered to your year & department.",
    },
    {
      icon: FlaskConical,
      title: "Mock tests with timer",
      desc: "Practice MCQs under exam conditions. Instant scoring, explanations and breakdowns.",
    },
    {
      icon: Search,
      title: "Instant global search",
      desc: "Find any paper, topic or test in milliseconds with ⌘K search.",
    },
    {
      icon: TrendingUp,
      title: "Progress tracking",
      desc: "See tests taken, average score and subjects covered. Stay ahead, not anxious.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-body">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#0A0A0A]/80 border-b border-[#1F1F1F]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2" data-testid="landing-logo">
            <div className="w-8 h-8 rounded-md bg-[#0066FF] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-lg">StudentHub</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <button
                data-testid="landing-go-dashboard-btn"
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-sm font-medium bg-[#0066FF] hover:bg-[#0052CC] rounded-md transition-colors"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  data-testid="landing-login-link"
                  className="text-sm text-neutral-400 hover:text-white px-3 py-2 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  data-testid="landing-signup-btn"
                  className="px-4 py-2 text-sm font-medium bg-[#0066FF] hover:bg-[#0052CC] rounded-md transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#0066FF]/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#262626] bg-[#121212] text-xs text-neutral-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
              Built for MAKAUT & engineering students
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter leading-[0.95] mb-6">
              Stop hunting for
              <br />
              <span className="text-[#0066FF]">past papers.</span>
              <br />
              Start scoring.
            </h1>
            <p className="text-lg text-neutral-400 max-w-2xl mb-8 leading-relaxed">
              A personalised academic workspace for your college, department and year. Previous year
              questions, CA &amp; PCA, semester papers, timed mock tests and performance insights —
              all in one calm, fast interface.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={user ? "/dashboard" : "/register"}
                data-testid="landing-cta-primary"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-[#0066FF] hover:bg-[#0052CC] rounded-md font-medium transition-colors"
              >
                {user ? "Open dashboard" : "Create your free account"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/login"
                data-testid="landing-cta-secondary"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#121212] border border-[#262626] hover:border-[#404040] rounded-md font-medium transition-colors"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
                Free forever tier
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
                No spam, no ads
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
                Built by students, for students
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-500 mb-3">
            Everything you need
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            One workspace. Every paper. Zero clutter.
          </h2>
          <p className="text-neutral-400 leading-relaxed">
            No more digging through WhatsApp groups or begging seniors for drive links. StudentHub
            gives you exactly what your syllabus demands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 bg-[#121212] border border-[#262626] rounded-lg hover:border-[#404040] transition-colors"
              data-testid={`landing-feature-${f.title.split(" ")[0].toLowerCase()}`}
            >
              <div className="w-10 h-10 rounded-md bg-[#0A0A0A] border border-[#262626] flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[#0066FF]" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#1F1F1F]">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-500 mb-3">
            Pricing
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Start free. Go premium when you're serious.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 bg-[#121212] border border-[#262626] rounded-lg">
            <div className="text-sm text-neutral-500 mb-2">Free</div>
            <div className="flex items-end gap-1 mb-6">
              <div className="font-display text-5xl font-bold">₹0</div>
              <div className="text-neutral-500 pb-2">/forever</div>
            </div>
            <ul className="space-y-3 text-sm text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00C853] mt-0.5" /> Subjects for your dept &amp; year
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00C853] mt-0.5" /> Past semester papers
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00C853] mt-0.5" /> Basic mock tests
              </li>
            </ul>
          </div>
          <div className="p-8 rounded-lg relative overflow-hidden border border-[#B266FF]/40 bg-gradient-to-br from-[#1a0f2a] to-[#121212]">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#B266FF] to-[#0066FF] text-white text-xs font-semibold px-3 py-1 rounded-bl-md">
              Recommended
            </div>
            <div className="text-sm text-[#B266FF] mb-2">Premium</div>
            <div className="flex items-end gap-1 mb-6">
              <div className="font-display text-5xl font-bold">₹49</div>
              <div className="text-neutral-400 pb-2">/month</div>
            </div>
            <ul className="space-y-3 text-sm text-neutral-200 mb-6">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B266FF] mt-0.5" /> All previous year papers
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B266FF] mt-0.5" /> 100+ important questions per subject
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B266FF] mt-0.5" /> Premium mock tests
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B266FF] mt-0.5" /> No ads, ever
              </li>
            </ul>
            <button
              data-testid="landing-pricing-upgrade-btn"
              onClick={() => navigate(user ? "/premium" : "/register")}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-[#B266FF] to-[#0066FF] hover:opacity-90 text-white font-medium rounded-md transition-opacity"
            >
              Get premium
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1F1F1F]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Your data stays yours. No trackers.
          </div>
          <div>© {new Date().getFullYear()} StudentHub</div>
        </div>
      </footer>
    </div>
  );
}
