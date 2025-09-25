import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/filters/inputs";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/providers/language-provider";

export type FilterOption = { value: string; label: string };

export type FilterDefinition = {
  id: string;
  label: string;
  options: FilterOption[];
  getValue?: (row: unknown) => string | string[] | null | undefined;

};

type FiltersDrawerProps = {
  availableFilters: FilterDefinition[];
  value: Record<string, string[]>;
  onChange: (value: Record<string, string[]>) => void;
};

const PRESET_KEY = "tender-portal-filter-presets";

type Preset = {
  id: string;
  name: string;
  filters: Record<string, string[]>;
};

export function FiltersDrawer({ availableFilters, value, onChange }: FiltersDrawerProps) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const raw = window.localStorage.getItem(PRESET_KEY);
      return raw ? (JSON.parse(raw) as Preset[]) : [];
    } catch {
      return [];
    }
  });
  const { push } = useToast();
  const { t, locale } = useLanguage();

  const activeCount = useMemo(
    () =>
      Object.values(value).reduce(
        (total, options) => total + (options ? options.length : 0),
        0
      ),
    [value]
  );

  const handleToggle = (filterId: string, optionValue: string) => {
    const current = value[filterId] ?? [];
    const next = current.includes(optionValue)
      ? current.filter((item) => item !== optionValue)
      : [...current, optionValue];
    onChange({ ...value, [filterId]: next });
  };

  const handleSavePreset = () => {
    const name = prompt(locale === "ar" ? "اسم المرشح" : "Preset name");
    if (!name) return;
    const preset: Preset = { id: crypto.randomUUID(), name, filters: value };
    const next = [...presets, preset];
    window.localStorage.setItem(PRESET_KEY, JSON.stringify(next));
    setPresets(next);
    push({ title: t("presetSaved") });
  };

  const handleApplyPreset = (preset: Preset) => {
    onChange(preset.filters);
    setOpen(false);
  };

  const handleRemovePreset = (preset: Preset) => {
    const next = presets.filter((item) => item.id !== preset.id);
    setPresets(next);
    window.localStorage.setItem(PRESET_KEY, JSON.stringify(next));
    push({ title: t("presetRemoved") });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline">
          {t("filters")} {activeCount > 0 ? `(${activeCount})` : ""}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              {t("filters")}
            </Dialog.Title>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSavePreset}>
                {locale === "ar" ? "حفظ كمرشح" : "Save preset"}
              </Button>
              <Dialog.Close asChild>
                <Button variant="ghost">{t("cancel")}</Button>
              </Dialog.Close>
            </div>
          </div>
          <div className="space-y-6">
            {availableFilters.map((filter) => (
              <div key={filter.id} className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">{filter.label}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {filter.options.map((option) => (
                    <Checkbox
                      key={option.value}
                      label={option.label}
                      checked={value[filter.id]?.includes(option.value) ?? false}
                      onCheckedChange={() => handleToggle(filter.id, option.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">
              {locale === "ar" ? "المرشحات المحفوظة" : "Saved presets"}
            </h4>
            <div className="space-y-2">
              {presets.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {locale === "ar"
                    ? "لم يتم حفظ أي مرشح بعد"
                    : "No presets saved yet"}
                </p>
              ) : (
                presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between rounded-2xl border border-border px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-sm font-medium text-primary"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePreset(preset)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      {locale === "ar" ? "حذف" : "Remove"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
