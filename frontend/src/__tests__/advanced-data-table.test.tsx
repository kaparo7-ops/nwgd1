import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table";
import { renderWithProviders } from "@/__tests__/test-utils";

const sample = [
  { id: "1", name: "Alpha", status: "draft" },
  { id: "2", name: "Beta", status: "submitted" }
];

describe("AdvancedDataTable", () => {
  it("filters rows via search input", async () => {
    renderWithProviders(
      <AdvancedDataTable
        data={sample}
        columns={[
          { accessorKey: "name", header: "Name" },
          { accessorKey: "status", header: "Status" }
        ]}
        searchableKeys={["name"]}
      />
    );

    expect(screen.getByText(/Alpha/i)).toBeInTheDocument();
    const search = screen.getByPlaceholderText(/Search/i);
    await userEvent.clear(search);
    await userEvent.type(search, "Beta");
    expect(screen.queryByText(/Alpha/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Beta/i)).toBeInTheDocument();
  });
});
