import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { CommandPalette } from "@/components/overlays/command-palette";
import { ToastProvider } from "@/components/ui/toast";
import { Skeleton } from "@/components/loaders/skeleton";
import { AuthProvider } from "@/providers/auth-provider";

const DashboardPage = lazy(() =>
  import("@/pages/dashboard").then((module) => ({ default: module.DashboardPage }))
);
const TendersPage = lazy(() =>
  import("@/pages/tenders").then((module) => ({ default: module.TendersPage }))
);
const ProjectsPage = lazy(() =>
  import("@/pages/projects").then((module) => ({ default: module.ProjectsPage }))
);
const SuppliersPage = lazy(() =>
  import("@/pages/suppliers").then((module) => ({ default: module.SuppliersPage }))
);
const FinancePage = lazy(() =>
  import("@/pages/finance").then((module) => ({ default: module.FinancePage }))
);
const ReportsPage = lazy(() =>
  import("@/pages/reports").then((module) => ({ default: module.ReportsPage }))
);
const AdminPage = lazy(() =>
  import("@/pages/admin").then((module) => ({ default: module.AdminPage }))
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CommandPalette />
          <AppShell>
            <Suspense
              fallback={
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tenders" element={<TendersPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </Suspense>
          </AppShell>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
