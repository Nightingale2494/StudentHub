import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  UserCircle2,
  Crown,
  LogOut,
  Shield,
  Sparkles,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/subjects", label: "Subjects", icon: BookOpen, testId: "nav-subjects" },
  { to: "/tests", label: "Mock Tests", icon: FlaskConical, testId: "nav-tests" },
  { to: "/profile", label: "Profile", icon: UserCircle2, testId: "nav-profile" },
  { to: "/premium", label: "Premium", icon: Crown, testId: "nav-premium" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside
      className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#1F1F1F] bg-[#0A0A0A] h-screen sticky top-0"
      data-testid="app-sidebar"
    >
      <div className="px-6 py-6 border-b border-[#1F1F1F]">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/dashboard")}
          data-testid="sidebar-logo"
        >
          <div className="w-8 h-8 rounded-md bg-[#0066FF] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-semibold text-lg text-white">StudentHub</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Study, Smart
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-[#121212] text-white border border-[#262626]"
                  : "text-neutral-400 hover:text-white hover:bg-[#121212]"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}

        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            data-testid="nav-admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-[#121212] text-white border border-[#262626]"
                  : "text-neutral-400 hover:text-white hover:bg-[#121212]"
              }`
            }
          >
            <Shield className="w-4 h-4" />
            Admin
          </NavLink>
        )}
      </nav>

      <div className="border-t border-[#1F1F1F] p-4">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-9 h-9 rounded-full bg-[#121212] border border-[#262626] flex items-center justify-center text-sm font-semibold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate" data-testid="sidebar-user-name">
              {user?.name}
            </div>
            <div className="text-xs text-neutral-500 truncate">
              {user?.department} · Year {user?.year}
            </div>
          </div>
        </div>
        <button
          data-testid="sidebar-logout-btn"
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm border border-[#262626] text-neutral-300 hover:bg-[#121212] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
