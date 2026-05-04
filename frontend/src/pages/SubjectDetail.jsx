import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Lock, FileText, FlaskConical, Play, Crown } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { key: "CA", label: "CA" },
  { key: "PCA", label: "PCA" },
  { key: "SEM", label: "Semester Papers" },
  { key: "IMPORTANT", label: "Important Questions" },
];

function FileRow({ file, canAccess, onOpen }) {
  const locked = file.isPremium && !canAccess;
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-md border ${
        locked ? "border-[#262626] bg-[#0F0F0F] opacity-90" : "border-[#262626] bg-[#121212] hover:border-[#404040]"
      } transition-colors`}
      data-testid={`file-row-${file.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-md bg-[#0A0A0A] border border-[#262626] flex items-center justify-center shrink-0">
          {locked ? (
            <Lock className="w-4 h-4 text-[#B266FF]" />
          ) : (
            <FileText className="w-4 h-4 text-[#0066FF]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate flex items-center gap-2">
            {file.title}
            {file.isPremium && (
              <span className="text-[10px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded border border-[#B266FF]/40 text-[#B266FF]">
                Premium
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {file.type} · {file.year}
          </div>
        </div>
      </div>
      <button
        onClick={() => onOpen(file, locked)}
        data-testid={`file-open-btn-${file.id}`}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
          locked
            ? "bg-gradient-to-r from-[#B266FF] to-[#0066FF] text-white hover:opacity-90"
            : "bg-[#0A0A0A] border border-[#262626] text-white hover:bg-[#1A1A1A]"
        }`}
      >
        {locked ? (
          <>
            <Crown className="w-4 h-4" /> Unlock
          </>
        ) : (
          <>
            <Download className="w-4 h-4" /> Open
          </>
        )}
      </button>
    </div>
  );
}

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subject, setSubject] = useState(null);
  const [files, setFiles] = useState([]);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    api.get(`/subjects/${id}`).then(({ data }) => setSubject(data));
    api.get(`/subjects/${id}/files`).then(({ data }) => setFiles(data));
    api.get(`/subjects/${id}/tests`).then(({ data }) => setTests(data));
  }, [id]);

  function openFile(file, locked) {
    if (locked) {
      toast.info("This is premium content. Upgrade to unlock.");
      navigate("/premium");
      return;
    }
    window.open(file.fileUrl, "_blank");
  }

  function startTest(test) {
    if (test.isPremium && !user?.isPremium) {
      toast.info("Premium mock test. Upgrade to start.");
      navigate("/premium");
      return;
    }
    navigate(`/tests/${test.id}`);
  }

  const grouped = TYPES.reduce((acc, t) => {
    acc[t.key] = files.filter((f) => f.type === t.key);
    return acc;
  }, {});

  return (
    <AppShell
      title={subject?.name || "Subject"}
      subtitle={subject ? `${subject.code} · Year ${subject.year} · Semester ${subject.semester}` : ""}
    >
      {subject && (
        <div className="mb-8 p-6 rounded-lg border border-[#262626] bg-[#121212] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-md flex items-center justify-center"
              style={{ background: `${subject.color || "#0066FF"}20`, color: subject.color || "#0066FF" }}
            >
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-neutral-400">{subject.description}</div>
            </div>
          </div>
          {tests.length > 0 && (
            <button
              onClick={() => startTest(tests[0])}
              data-testid="subject-start-first-test-btn"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] rounded-md text-sm font-medium"
            >
              <FlaskConical className="w-4 h-4" />
              Start mock test
            </button>
          )}
        </div>
      )}

      <Tabs defaultValue="CA" className="w-full">
        <TabsList className="bg-[#121212] border border-[#262626] p-1" data-testid="subject-tabs">
          {TYPES.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              data-testid={`subject-tab-${t.key}`}
              className="data-[state=active]:bg-[#0A0A0A] data-[state=active]:text-white text-neutral-400"
            >
              {t.label}
              <span className="ml-2 text-xs text-neutral-500">{grouped[t.key].length}</span>
            </TabsTrigger>
          ))}
          <TabsTrigger
            value="TESTS"
            data-testid="subject-tab-TESTS"
            className="data-[state=active]:bg-[#0A0A0A] data-[state=active]:text-white text-neutral-400"
          >
            Mock Tests
            <span className="ml-2 text-xs text-neutral-500">{tests.length}</span>
          </TabsTrigger>
        </TabsList>

        {TYPES.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-6 space-y-3">
            {grouped[t.key].length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500 border border-dashed border-[#262626] rounded-md">
                No {t.label.toLowerCase()} uploaded yet.
              </div>
            ) : (
              grouped[t.key].map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  canAccess={user?.isPremium}
                  onOpen={openFile}
                />
              ))
            )}
          </TabsContent>
        ))}

        <TabsContent value="TESTS" className="mt-6 space-y-3">
          {tests.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500 border border-dashed border-[#262626] rounded-md">
              No mock tests available for this subject yet.
            </div>
          ) : (
            tests.map((t) => {
              const locked = t.isPremium && !user?.isPremium;
              return (
                <div
                  key={t.id}
                  className="p-4 rounded-md border border-[#262626] bg-[#121212] hover:border-[#404040] transition-colors flex items-center justify-between"
                  data-testid={`test-row-${t.id}`}
                >
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
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
                    onClick={() => startTest(t)}
                    data-testid={`start-test-btn-${t.id}`}
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
            })
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
