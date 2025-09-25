import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/providers/language-provider";

const shortcuts = [
  { path: "/", label: { en: "Dashboard", ar: "لوحة التحكم" } },
  { path: "/tenders", label: { en: "Tenders", ar: "المناقصات" } },
  { path: "/projects", label: { en: "Projects", ar: "المشاريع" } },
  { path: "/suppliers", label: { en: "Suppliers", ar: "الموردون" } },
  { path: "/finance", label: { en: "Finance", ar: "المالية" } },
  { path: "/reports", label: { en: "Reports", ar: "التقارير" } },
  { path: "/admin", label: { en: "Admin", ar: "الإدارة" } }
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { locale, t } = useLanguage();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global navigation"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 py-24"
    >
      <Command.List className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <Command.Input
            autoFocus
            placeholder={t("commandPalettePlaceholder")}
            className="h-10 w-full border-none text-sm outline-none"
          />
        </div>
        <Command.Empty className="px-4 py-6 text-sm text-slate-500">
          {t("noResults")}
        </Command.Empty>
        <Command.Group>
          {shortcuts.map((shortcut) => (
            <Command.Item
              key={shortcut.path}
              value={shortcut.path}
              onSelect={(value) => {
                navigate(value);
                setOpen(false);
              }}
              className="cursor-pointer px-4 py-3 text-sm text-slate-600 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
            >
              {shortcut.label[locale]}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
