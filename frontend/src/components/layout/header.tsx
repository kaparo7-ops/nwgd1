import { Bell, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import { Select, type SelectOption } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import type { Role } from "@/utils/types";

const roles: SelectOption<Role>[] = [
  { value: "admin", label: "Admin" },
  { value: "procurement", label: "Procurement" },
  { value: "finance", label: "Finance" },
  { value: "project", label: "Project" },
  { value: "viewer", label: "Viewer" }
];

type HeaderProps = {
  onOpenMobileNav: () => void;
};

export function Header({ onOpenMobileNav }: HeaderProps) {
  const { t, toggleLocale, direction, locale } = useLanguage();
  const { user, setRole } = useAuth();
  const [isDark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-white/95 p-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden items-center gap-2 rounded-2xl border border-border bg-white px-4 lg:flex">
          <Input
            placeholder={t("search")}
            className="border-none px-0 focus-visible:ring-0"
          />
        </div>
      </div>
      <div className={cn("flex items-center gap-3", direction === "rtl" && "flex-row-reverse")}
      >
        <Button variant="ghost" size="icon" onClick={() => setDark((prev) => !prev)}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={toggleLocale}>
          {t("languageSwitch")}
        </Button>
        <Select<Role>
          value={user.role}
          onChange={(value) => setRole(value)}
          options={roles}
          placeholder="Role"
          triggerClassName="w-40"
        />
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
          <span className="sr-only">{locale === "ar" ? "الإشعارات" : "Notifications"}</span>
        </Button>
        <div className="hidden flex-col text-xs font-medium text-slate-500 sm:flex">
          <span className="text-slate-900">{user.name}</span>
          <span>{user.email}</span>
        </div>
      </div>
    </header>
  );
}
