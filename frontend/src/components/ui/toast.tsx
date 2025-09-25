import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "danger";
};

type ToastContextValue = {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push: (toast) =>
        setToasts((prev) => [
          ...prev,
          { id: crypto.randomUUID(), variant: "default", ...toast }
        ]),
      dismiss: (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }),
    [toasts]
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitives.Provider swipeDirection="right" duration={4500}>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitives.Root
            key={toast.id}
            className={cn(
              "pointer-events-auto mt-3 w-[320px] rounded-2xl border border-border bg-white p-4 shadow-soft",
              toast.variant === "danger" && "border-red-200 bg-red-50"
            )}
            onOpenChange={(open) => !open && value.dismiss(toast.id)}
            open
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <ToastPrimitives.Title className="text-sm font-semibold text-slate-900">
                  {toast.title}
                </ToastPrimitives.Title>
                {toast.description ? (
                  <ToastPrimitives.Description className="mt-1 text-xs text-slate-500">
                    {toast.description}
                  </ToastPrimitives.Description>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => value.dismiss(toast.id)}
                className="rounded-full p-1 text-slate-400 transition hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </ToastPrimitives.Root>
        ))}
        <ToastPrimitives.Viewport className="fixed bottom-6 right-6 flex w-[320px] flex-col" />
      </ToastPrimitives.Provider>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
};
