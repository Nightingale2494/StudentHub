import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, formatApiError } from "@/lib/api";
import { Plus, Users, BookOpen, FileText, FlaskConical } from "lucide-react";
import { toast } from "sonner";

function StatBox({ icon: Icon, label, value, testId }) {
  return (
    <div className="p-5 rounded-lg border border-[#262626] bg-[#121212]" data-testid={testId}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-neutral-500 mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="font-display text-3xl font-semibold">{value ?? 0}</div>
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [tab, setTab] = useState("subject");
  const [uploadsCfg, setUploadsCfg] = useState(null);
  const [uploading, setUploading] = useState(false);

  // forms
  const [subjForm, setSubjForm] = useState({
    name: "", code: "", department: "CSE", year: 2, semester: 3, description: "", color: "#0066FF",
  });
  const [fileForm, setFileForm] = useState({
    subjectId: "", title: "", type: "CA", year: 2024, fileUrl: "", isPremium: false,
  });
  const [testForm, setTestForm] = useState({
    subjectId: "", title: "", duration: 10, isPremium: false,
    questionsText: JSON.stringify(
      [
        { question: "Sample question?", options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "" },
      ],
      null,
      2
    ),
  });

  async function loadAll() {
    try {
      const [{ data: st }, { data: subs }, cfgRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/subjects"),
        api.get("/uploads/config").catch(() => ({ data: { enabled: false } })),
      ]);
      setStats(st);
      setSubjects(subs);
      setUploadsCfg(cfgRes.data);
      if (subs.length && !fileForm.subjectId) {
        setFileForm((f) => ({ ...f, subjectId: subs[0].id }));
        setTestForm((t) => ({ ...t, subjectId: subs[0].id }));
      }
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSubject(e) {
    e.preventDefault();
    try {
      await api.post("/subjects", { ...subjForm, year: Number(subjForm.year), semester: Number(subjForm.semester) });
      toast.success("Subject created");
      setSubjForm((f) => ({ ...f, name: "", code: "", description: "" }));
      loadAll();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function createFile(e) {
    e.preventDefault();
    try {
      await api.post("/files", { ...fileForm, year: Number(fileForm.year) });
      toast.success("File added");
      setFileForm((f) => ({ ...f, title: "", fileUrl: "" }));
      loadAll();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handlePdfUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!uploadsCfg?.enabled) {
      toast.error("Firebase Storage not configured yet. Paste a URL directly or add credentials.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const { data } = await api.post("/uploads/pdf", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileForm((cur) => ({
        ...cur,
        fileUrl: data.url,
        title: cur.title || f.name.replace(/\.pdf$/i, ""),
      }));
      toast.success(`Uploaded: ${f.name}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function createTest(e) {
    e.preventDefault();
    try {
      const questions = JSON.parse(testForm.questionsText);
      await api.post("/tests", {
        subjectId: testForm.subjectId,
        title: testForm.title,
        duration: Number(testForm.duration),
        isPremium: testForm.isPremium,
        questions,
      });
      toast.success("Test created");
      setTestForm((t) => ({ ...t, title: "" }));
      loadAll();
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error("Invalid JSON in questions.");
      } else {
        toast.error(formatApiError(err));
      }
    }
  }

  return (
    <AppShell title="Admin panel" subtitle="Manage content: subjects, files, mock tests">
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <StatBox icon={Users} label="Users" value={stats?.users} testId="admin-stat-users" />
        <StatBox icon={BookOpen} label="Subjects" value={stats?.subjects} testId="admin-stat-subjects" />
        <StatBox icon={FileText} label="Files" value={stats?.files} testId="admin-stat-files" />
        <StatBox icon={FlaskConical} label="Tests" value={stats?.tests} testId="admin-stat-tests" />
        <StatBox icon={Plus} label="Attempts" value={stats?.attempts} testId="admin-stat-attempts" />
      </section>

      <div className="flex gap-2 mb-6" data-testid="admin-tabs">
        {[
          { key: "subject", label: "Add Subject" },
          { key: "file", label: "Add File" },
          { key: "test", label: "Add Mock Test" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`admin-tab-${t.key}`}
            className={`px-4 py-2 rounded-md text-sm border transition-colors ${
              tab === t.key
                ? "border-[#0066FF] bg-[#0066FF]/10 text-white"
                : "border-[#262626] bg-[#121212] text-neutral-400 hover:border-[#404040]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "subject" && (
        <form
          onSubmit={createSubject}
          className="grid md:grid-cols-2 gap-4 p-6 rounded-lg border border-[#262626] bg-[#121212]"
          data-testid="admin-subject-form"
        >
          <Input label="Name" value={subjForm.name} onChange={(v) => setSubjForm({ ...subjForm, name: v })} required testId="admin-subject-name" />
          <Input label="Code" value={subjForm.code} onChange={(v) => setSubjForm({ ...subjForm, code: v })} required testId="admin-subject-code" />
          <Input label="Department" value={subjForm.department} onChange={(v) => setSubjForm({ ...subjForm, department: v })} required testId="admin-subject-dept" />
          <Input label="Year" type="number" value={subjForm.year} onChange={(v) => setSubjForm({ ...subjForm, year: v })} required testId="admin-subject-year" />
          <Input label="Semester" type="number" value={subjForm.semester} onChange={(v) => setSubjForm({ ...subjForm, semester: v })} required testId="admin-subject-sem" />
          <Input label="Color (hex)" value={subjForm.color} onChange={(v) => setSubjForm({ ...subjForm, color: v })} testId="admin-subject-color" />
          <div className="md:col-span-2">
            <Input label="Description" value={subjForm.description} onChange={(v) => setSubjForm({ ...subjForm, description: v })} testId="admin-subject-desc" />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              data-testid="admin-subject-submit"
              className="px-4 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] rounded-md text-sm font-medium"
            >
              Create subject
            </button>
          </div>
        </form>
      )}

      {tab === "file" && (
        <form
          onSubmit={createFile}
          className="grid md:grid-cols-2 gap-4 p-6 rounded-lg border border-[#262626] bg-[#121212]"
          data-testid="admin-file-form"
        >
          <div>
            <Label>Subject</Label>
            <select
              value={fileForm.subjectId}
              onChange={(e) => setFileForm({ ...fileForm, subjectId: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2.5 text-sm"
              required
              data-testid="admin-file-subject"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Type</Label>
            <select
              value={fileForm.type}
              onChange={(e) => setFileForm({ ...fileForm, type: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2.5 text-sm"
              data-testid="admin-file-type"
            >
              {["CA", "PCA", "SEM", "IMPORTANT"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <Input label="Title" value={fileForm.title} onChange={(v) => setFileForm({ ...fileForm, title: v })} required testId="admin-file-title" />
          <Input label="Year" type="number" value={fileForm.year} onChange={(v) => setFileForm({ ...fileForm, year: v })} required testId="admin-file-year" />
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <Label>File URL (paste direct PDF link OR upload below)</Label>
              {uploadsCfg && (
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    uploadsCfg.enabled
                      ? "bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30"
                      : "bg-[#FFBF00]/15 text-[#FFBF00] border border-[#FFBF00]/30"
                  }`}
                  data-testid="admin-file-upload-status"
                >
                  {uploadsCfg.enabled ? "Firebase Storage ready" : "Storage not configured"}
                </span>
              )}
            </div>
            <input
              type="text"
              value={fileForm.fileUrl}
              onChange={(e) => setFileForm({ ...fileForm, fileUrl: e.target.value })}
              required
              data-testid="admin-file-url"
              placeholder="https://firebasestorage.googleapis.com/… or any PDF link"
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40 focus:border-[#0066FF]"
            />
            <div className="mt-2 flex items-center gap-3">
              <label
                htmlFor="pdf-upload-input"
                data-testid="admin-file-upload-label"
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border cursor-pointer transition-colors ${
                  uploading
                    ? "opacity-60 cursor-wait border-[#262626] bg-[#121212]"
                    : "border-[#0066FF] bg-[#0066FF]/10 text-white hover:bg-[#0066FF]/20"
                }`}
              >
                {uploading ? "Uploading…" : "Upload PDF to Firebase"}
              </label>
              <input
                id="pdf-upload-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfUpload}
                disabled={uploading}
                data-testid="admin-file-upload-input"
              />
              {fileForm.fileUrl && (
                <a
                  href={fileForm.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#00E5FF] hover:underline truncate max-w-xs"
                  data-testid="admin-file-url-preview"
                >
                  Preview link ↗
                </a>
              )}
            </div>
            {!uploadsCfg?.enabled && (
              <div className="text-xs text-neutral-500 mt-2">
                To enable uploads: drop your Firebase service-account JSON at
                <span className="font-mono text-neutral-400"> /app/backend/secrets/firebase-admin.json </span>
                and set <span className="font-mono text-neutral-400">FIREBASE_STORAGE_BUCKET</span> in
                <span className="font-mono text-neutral-400"> backend/.env</span>.
              </div>
            )}
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isPremiumFile"
              checked={fileForm.isPremium}
              onChange={(e) => setFileForm({ ...fileForm, isPremium: e.target.checked })}
              data-testid="admin-file-premium"
            />
            <label htmlFor="isPremiumFile" className="text-sm text-neutral-300">
              Premium only
            </label>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              data-testid="admin-file-submit"
              className="px-4 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] rounded-md text-sm font-medium"
            >
              Add file
            </button>
          </div>
        </form>
      )}

      {tab === "test" && (
        <form
          onSubmit={createTest}
          className="grid md:grid-cols-2 gap-4 p-6 rounded-lg border border-[#262626] bg-[#121212]"
          data-testid="admin-test-form"
        >
          <div>
            <Label>Subject</Label>
            <select
              value={testForm.subjectId}
              onChange={(e) => setTestForm({ ...testForm, subjectId: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2.5 text-sm"
              required
              data-testid="admin-test-subject"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="Title" value={testForm.title} onChange={(v) => setTestForm({ ...testForm, title: v })} required testId="admin-test-title" />
          <Input label="Duration (min)" type="number" value={testForm.duration} onChange={(v) => setTestForm({ ...testForm, duration: v })} required testId="admin-test-duration" />
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isPremiumTest"
              checked={testForm.isPremium}
              onChange={(e) => setTestForm({ ...testForm, isPremium: e.target.checked })}
              data-testid="admin-test-premium"
            />
            <label htmlFor="isPremiumTest" className="text-sm text-neutral-300">
              Premium only
            </label>
          </div>
          <div className="md:col-span-2">
            <Label>Questions (JSON array)</Label>
            <textarea
              value={testForm.questionsText}
              onChange={(e) => setTestForm({ ...testForm, questionsText: e.target.value })}
              rows={10}
              data-testid="admin-test-questions"
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40"
            />
            <div className="text-xs text-neutral-500 mt-1">
              Each item: {"{"}question, options[], correctIndex, explanation?{"}"}
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              data-testid="admin-test-submit"
              className="px-4 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] rounded-md text-sm font-medium"
            >
              Create test
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
}

function Label({ children }) {
  return <label className="block text-sm text-neutral-400 mb-1.5">{children}</label>;
}

function Input({ label, value, onChange, type = "text", required, testId }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        data-testid={testId}
        className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/40 focus:border-[#0066FF]"
      />
    </div>
  );
}
