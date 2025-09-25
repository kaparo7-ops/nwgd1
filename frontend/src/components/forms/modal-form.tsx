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
        <Dialog.Content className="fixed inset-0 z-50 mx-auto my-24 w-full max-w-xl rounded-3xl bg-white p-8 shadow-soft">
          <Dialog.Title className="text-xl font-semibold text-slate-900">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-sm text-slate-500">
              {description}
            </Dialog.Description>
          ) : null}
          <div className="mt-6 space-y-4">{children}</div>
          <div className="mt-8 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="ghost">{t("cancel")}</Button>
            </Dialog.Close>
            <Button onClick={onSubmit}>{t("save")}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
