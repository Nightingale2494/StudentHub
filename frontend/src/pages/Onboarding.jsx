import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { Sparkles, GraduationCap, Building2, CalendarRange } from "lucide-react";
import { toast } from "sonner";

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [collegeId, setCollegeId] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentQuery, setDepartmentQuery] = useState("");
  const [year, setYear] = useState(2);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/colleges").then(({ data }) => setColleges(data));
  }, []);

  useEffect(() => {
    if (!collegeId) {
      setDepartments([]);
      setDepartmentCode("");
      setDepartmentQuery("");
      return;
    }
    api.get(`/departments`, { params: { collegeId } }).then(({ data }) => {
      setDepartments(data);
      if (data.length > 0 && !data.some((d) => d.code === departmentCode)) {
        setDepartmentCode(data[0].code);
      }
    });
  }, [collegeId, departmentCode]);

  const filteredDepartments = departments.filter((d) => {
    const q = departmentQuery.trim().toLowerCase();
    if (!q) return true;
    return d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
  });

  async function onSubmit(e) {
    e.preventDefault();
    if (!collegeId || !departmentCode) {
      setError("Please select your college and department.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const college = colleges.find((c) => c.id === collegeId);
      await completeOnboarding(college.shortName || college.name, departmentCode, Number(year));
      toast.success("Your workspace is personalised");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-[#0066FF] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-semibold text-lg">StudentHub</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-xl">
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Step 1 of 1</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            Hi {user?.name?.split(" ")[0]}, let's set you up
          </h1>
          <p className="text-neutral-400 mb-8">
            Tell us your college, department and year — we'll show you only what matters to you.
          </p>

          <form onSubmit={onSubmit} className="space-y-5" data-testid="onboarding-form">
            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1.5">
                <Building2 className="w-4 h-4" /> College
              </label>
              <select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                required
                data-testid="onboarding-college-select"
                className="w-full bg-[#121212] border border-[#262626] rounded-md px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40 focus:border-[#0066FF]"
              >
                <option value="">Select your college</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName ? `${c.shortName} — ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1.5">
                <GraduationCap className="w-4 h-4" /> Department
              </label>
              <input
                value={departmentQuery}
                onChange={(e) => setDepartmentQuery(e.target.value)}
                disabled={!collegeId}
                placeholder={collegeId ? "Search department code or name" : "Select college first"}
                data-testid="onboarding-department-search"
                className="w-full mb-2 bg-[#121212] border border-[#262626] rounded-md px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40 focus:border-[#0066FF] disabled:opacity-50"
              />
              <select
                value={departmentCode}
                onChange={(e) => setDepartmentCode(e.target.value)}
                disabled={!collegeId}
                required
                data-testid="onboarding-department-select"
                className="w-full bg-[#121212] border border-[#262626] rounded-md px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40 focus:border-[#0066FF] disabled:opacity-50"
              >
                <option value="">
                  {collegeId ? "Select your department" : "Select college first"}
                </option>
                {filteredDepartments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
              {collegeId && filteredDepartments.length === 0 && (
                <p className="mt-2 text-xs text-neutral-500">No departments matched your search.</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1.5">
                <CalendarRange className="w-4 h-4" /> Year
              </label>
              <div className="grid grid-cols-4 gap-2" data-testid="onboarding-year-group">
                {[1, 2, 3, 4].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    data-testid={`onboarding-year-${y}`}
                    className={`px-3 py-2.5 rounded-md text-sm border transition-colors ${
                      year === y
                        ? "bg-[#0066FF] border-[#0066FF] text-white"
                        : "bg-[#121212] border-[#262626] text-neutral-300 hover:border-[#404040]"
                    }`}
                  >
                    Year {y}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-[#FF3366] bg-[#FF3366]/10 border border-[#FF3366]/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="onboarding-submit-btn"
              className="w-full px-4 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 rounded-md font-medium transition-colors"
            >
              {submitting ? "Saving…" : "Continue to dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
