import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Crown, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Premium() {
  const { user, refreshMe } = useAuth();
  const [config, setConfig] = useState(null);
  const [plan, setPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/payments/config").then(({ data }) => setConfig(data));
  }, []);

  async function upgrade() {
    setBusy(true);
    try {
      const { data: order } = await api.post("/payments/order", { plan });

      if (order.mock || !config?.enabled) {
        toast.info(
          "Razorpay keys not configured yet. Ask admin to add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in backend/.env"
        );
        setBusy(false);
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) {
        toast.error("Could not load Razorpay checkout.");
        setBusy(false);
        return;
      }

      const options = {
        key: config.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "StudentHub",
        description: `${plan === "monthly" ? "Monthly" : "Yearly"} Premium`,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#0066FF" },
        handler: async (res) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
              plan,
            });
            toast.success("Welcome to Premium!");
            await refreshMe();
          } catch (err) {
            toast.error(formatApiError(err));
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      };
      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err) {
      toast.error(formatApiError(err));
      setBusy(false);
    }
  }

  const price = plan === "monthly" ? 49 : 499;

  return (
    <AppShell title="Premium" subtitle="Invest ₹49. Save 200 hours of hunting for PDFs.">
      {user?.isPremium ? (
        <div
          className="p-8 rounded-lg border border-[#B266FF]/40 bg-gradient-to-r from-[#1a0f2a] to-[#121212] flex items-center gap-4"
          data-testid="premium-active-card"
        >
          <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#B266FF] to-[#0066FF] flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">You're on Premium 🎉</div>
            <div className="text-sm text-neutral-400 mt-1">
              Plan: <span className="text-white capitalize">{user.plan}</span> · Expires:{" "}
              <span className="text-white">
                {user.expiryDate ? new Date(user.expiryDate).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
              Everything you unlock
            </div>
            <h2 className="font-display text-3xl font-semibold mb-6">
              All previous year papers. 100+ important questions. Zero ads.
            </h2>
            <ul className="space-y-4 text-neutral-200">
              {[
                "Full access to all CA, PCA & semester papers (any year)",
                "100+ hand-picked important questions per subject",
                "Access to all premium mock tests with explanations",
                "Priority request: ask for specific papers we don't yet have",
                "No ads, ever — just you, your syllabus, and your score",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#B266FF] mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 p-5 rounded-md border border-[#262626] bg-[#121212] text-sm text-neutral-400 flex gap-3">
              <Sparkles className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-medium">Students who use Premium</span> score an
                average of <span className="text-[#00C853] font-semibold">20% higher</span> on
                semester exams, because they practise with the same paper patterns.
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-[#B266FF]/40 bg-gradient-to-br from-[#1a0f2a] to-[#121212] h-fit sticky top-24">
            <div className="flex gap-2 mb-6" data-testid="premium-plan-toggle">
              {["monthly", "yearly"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  data-testid={`premium-plan-${p}-btn`}
                  className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                    plan === p
                      ? "border-[#B266FF] bg-[#B266FF]/15 text-white"
                      : "border-[#262626] text-neutral-400 hover:border-[#404040]"
                  }`}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-1 mb-2">
              <div className="font-display text-5xl font-bold">₹{price}</div>
              <div className="text-neutral-500 pb-2">/{plan === "monthly" ? "mo" : "yr"}</div>
            </div>
            {plan === "yearly" && (
              <div className="text-xs text-[#00C853] mb-4">Save ₹89 vs monthly — 15% off</div>
            )}
            <button
              onClick={upgrade}
              disabled={busy}
              data-testid="premium-upgrade-btn"
              className="mt-4 w-full px-4 py-3 rounded-md bg-gradient-to-r from-[#B266FF] to-[#0066FF] hover:opacity-90 font-semibold text-sm disabled:opacity-60"
            >
              {busy ? "Processing…" : `Upgrade now — ₹${price}`}
            </button>
            <div className="mt-3 text-xs text-neutral-500 text-center">
              Secure payment via Razorpay · UPI, Cards, Wallets
            </div>
            {config && !config.enabled && (
              <div
                className="mt-3 text-xs text-[#FFBF00] text-center"
                data-testid="premium-not-configured-note"
              >
                Payments not yet configured. Add Razorpay keys to activate.
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
