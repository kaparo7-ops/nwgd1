import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/utils/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted">
      <Sidebar />
      <div className="flex w-full flex-col">
        <Header onOpenMobileNav={() => setMobileOpen(true)} />
        <main className={cn("flex-1 px-4 pb-10 pt-6 sm:px-8", "space-y-6")}>{children}</main>
      </div>
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 bg-white p-6 shadow-soft">
            <Sidebar />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
