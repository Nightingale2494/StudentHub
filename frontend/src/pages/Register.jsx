import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await register(name, email, password);
      toast.success(`Welcome, ${user.name.split(" ")[0]}! Let's personalise your space.`);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center">
        <Link to="/" className="flex items-center gap-2" data-testid="register-logo">
          <div className="w-8 h-8 rounded-md bg-[#0066FF] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold text-lg">StudentHub</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            Create your account
          </h1>
          <p className="text-neutral-400 mb-8">Takes less than 30 seconds.</p>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="register-name-input"
                className="w-full bg-[#121212] border border-[#262626] rounded-md px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40 focus:border-[#0066FF] transition-all"
                placeholder="Rohan Das"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="register-email-input"
                className="w-full bg-[#121212] border border-[#262626] rounded-md px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40 focus:border-[#0066FF] transition-all"
                placeholder="you@college.edu"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="register-password-input"
                className="w-full bg-[#121212] border border-[#262626] rounded-md px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40 focus:border-[#0066FF] transition-all"
                placeholder="Minimum 6 characters"
              />
            </div>

            {error && (
              <div
                className="text-sm text-[#FF3366] bg-[#FF3366]/10 border border-[#FF3366]/30 rounded-md px-3 py-2"
                data-testid="register-error"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="register-submit-btn"
              className="w-full px-4 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 rounded-md font-medium transition-colors"
            >
              {submitting ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-sm text-neutral-500">
            Already a member?{" "}
            <Link to="/login" data-testid="register-login-link" className="text-[#0066FF] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
