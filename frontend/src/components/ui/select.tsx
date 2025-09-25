import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type SelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  placeholder?: string;
  triggerClassName?: string;
  icon?: ReactNode;
};

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  triggerClassName,
  icon
}: SelectProps<T>) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-border bg-white px-4 text-sm",
          triggerClassName
        )}
      >
        <span className="flex items-center gap-2">
          {icon}
          {options.find((option) => option.value === value)?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-50 min-w-[220px] rounded-2xl border border-border bg-white p-2 shadow-soft">
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:bg-primary/10 focus:text-primary",
                value === option.value && "bg-primary/10 text-primary"
              )}
            >
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
