import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/language-provider";
import type { ReactNode } from "react";

export function ModalForm({
  trigger,
  title,
  description,
  children,
  onSubmit
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <div className="flex h-[95vh] w-[95vw] max-h-[95vh] max-w-[95vw] flex-col overflow-hidden rounded-3xl bg-white shadow-soft">
            <header className="sticky top-0 z-10 border-b border-border bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <Dialog.Title className="text-xl font-semibold text-slate-900">{title}</Dialog.Title>
                  {description ? (
                    <Dialog.Description className="text-sm text-slate-500">
                      {description}
                    </Dialog.Description>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Dialog.Close asChild>
                    <Button variant="ghost">{t("cancel")}</Button>
                  </Dialog.Close>
                  <Button onClick={onSubmit}>{t("save")}</Button>
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            <footer className="sticky bottom-0 z-10 border-t border-border bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="ghost">{t("cancel")}</Button>
                </Dialog.Close>
                <Button onClick={onSubmit}>{t("save")}</Button>
              </div>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
