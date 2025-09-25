import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

type Tab = {
  id: string;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  tabs: Tab[];
  value: string;
  onValueChange: (value: string) => void;
};

export function Tabs({ tabs, value, onValueChange }: TabsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onValueChange(tab.id)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition",
              value === tab.id
                ? "bg-primary text-white shadow-soft"
                : "bg-muted text-slate-600 hover:bg-primary/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        {tabs.find((tab) => tab.id === value)?.content}
      </div>
    </div>
  );
}
