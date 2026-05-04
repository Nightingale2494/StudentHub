import { useState } from "react";
import { Search, Crown, Menu } from "lucide-react";
import SearchDialog from "@/components/SearchDialog";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TopBar({ title, subtitle }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header
        className="sticky top-0 z-30 backdrop-blur-xl bg-[#0A0A0A]/80 border-b border-[#1F1F1F]"
        data-testid="app-topbar"
      >
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="min-w-0">
            {title && (
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-white truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-neutral-500 truncate mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              data-testid="topbar-search-btn"
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#262626] bg-[#121212] text-sm text-neutral-400 hover:text-white hover:border-[#404040] transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search…</span>
              <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#0A0A0A] border border-[#262626] text-neutral-500">
                ⌘K
              </kbd>
            </button>

            {!user?.isPremium && (
              <button
                onClick={() => navigate("/premium")}
                data-testid="topbar-upgrade-btn"
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-[#B266FF] to-[#0066FF] text-white hover:opacity-90 transition-opacity"
              >
                <Crown className="w-4 h-4" />
                Upgrade
              </button>
            )}
          </div>
        </div>
      </header>

      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
