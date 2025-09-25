import { useId } from "react";

export function Checkbox({
  label,
  checked,
  onCheckedChange
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border px-3 py-2 text-xs text-slate-600 hover:border-primary">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
      />
      <span>{label}</span>
    </label>
  );
}
