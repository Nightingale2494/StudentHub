import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { BookOpen, FileText, FlaskConical } from "lucide-react";

export default function SearchDialog({ open, onOpenChange }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ subjects: [], tests: [], files: [] });
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange]);

  useEffect(() => {
    let active = true;
    if (!q || q.length < 2) {
      setResults({ subjects: [], tests: [], files: [] });
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search`, { params: { q } });
        if (active) setResults(data);
      } catch (_e) {}
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  function go(path) {
    onOpenChange(false);
    setQ("");
    navigate(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search subjects, tests, files…"
        value={q}
        onValueChange={setQ}
        data-testid="search-input"
      />
      <CommandList>
        <CommandEmpty>No results. Try something else.</CommandEmpty>

        {results.subjects?.length > 0 && (
          <CommandGroup heading="Subjects">
            {results.subjects.map((s) => (
              <CommandItem
                key={s.id}
                onSelect={() => go(`/subjects/${s.id}`)}
                data-testid={`search-result-subject-${s.id}`}
              >
                <BookOpen className="w-4 h-4 mr-2 text-[#0066FF]" />
                <span>{s.name}</span>
                <span className="ml-auto text-xs text-neutral-500">{s.code}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.tests?.length > 0 && (
          <CommandGroup heading="Mock Tests">
            {results.tests.map((t) => (
              <CommandItem
                key={t.id}
                onSelect={() => go(`/tests/${t.id}`)}
                data-testid={`search-result-test-${t.id}`}
              >
                <FlaskConical className="w-4 h-4 mr-2 text-[#00E5FF]" />
                <span>{t.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.files?.length > 0 && (
          <CommandGroup heading="Files">
            {results.files.map((f) => (
              <CommandItem
                key={f.id}
                onSelect={() => {
                  window.open(f.fileUrl, "_blank");
                  onOpenChange(false);
                }}
                data-testid={`search-result-file-${f.id}`}
              >
                <FileText className="w-4 h-4 mr-2 text-[#B266FF]" />
                <span>{f.title}</span>
                <span className="ml-auto text-xs text-neutral-500">
                  {f.type} · {f.year}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
