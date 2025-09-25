import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { DashboardPage } from "@/pages/dashboard";
import { renderWithProviders } from "@/__tests__/test-utils";

vi.mock("@/services/mockApi", () => ({
  fetchDashboard: vi.fn().mockResolvedValue({
    metrics: [
      { id: "metric-1", label: "Active Tenders", value: "5", change: 3 },
      { id: "metric-2", label: "Pipeline Value", value: "1.2M USD", change: 5 },
      { id: "metric-3", label: "Projects At Risk", value: "1", change: -1 }
    ],
    pipeline: [
      { stage: "Shared", value: 2 },
      { stage: "Submitted", value: 3 }
    ],
    cashflow: [
      { month: "Jan", pipeline: 100, invoices: 80, expenses: 60 },
      { month: "Feb", pipeline: 120, invoices: 90, expenses: 70 }
    ],
    notifications: []
  })
}));

const mockApi = await import("@/services/mockApi");

afterEach(() => {
  vi.clearAllMocks();
});

describe("DashboardPage", () => {
  it("renders metrics from the dashboard service", async () => {
    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(mockApi.fetchDashboard).toHaveBeenCalled();
    });
    expect(await screen.findByText(/Active Tenders/i)).toBeInTheDocument();
    expect(screen.getByText(/Pipeline Value/i)).toBeInTheDocument();
  });
});
