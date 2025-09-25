import { NavLink } from "react-router-dom";
import { useLanguage } from "@/providers/language-provider";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Factory,
  Landmark,
  BarChart3,
  Settings
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, key: "dashboard" },
  { to: "/tenders", icon: FileText, key: "tenders" },
  { to: "/projects", icon: FolderKanban, key: "projects" },
  { to: "/suppliers", icon: Factory, key: "suppliers" },
  { to: "/finance", icon: Landmark, key: "finance" },
  { to: "/reports", icon: BarChart3, key: "reports" },
  { to: "/admin", icon: Settings, key: "admin" }
] as const;

export function Sidebar() {
  const { t, direction } = useLanguage();
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-4 border-border bg-white p-6 shadow-soft lg:flex">
      <div className="text-lg font-bold text-primary">Tender Portal</div>
      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-white shadow-soft"
                  : "text-slate-600 hover:bg-muted"
              )
            }
          >
            <item.icon
              className={cn("h-4 w-4", direction === "rtl" ? "order-2" : "order-1")}
            />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
      <footer className="text-xs text-slate-400">
        © {new Date().getFullYear()} Tender Management Co.
      </footer>
    </aside>
  );
}
