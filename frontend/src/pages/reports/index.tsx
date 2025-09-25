import { useState } from "react";
import { exportTendersCsv } from "@/services/mockApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportsPage() {
  const [isExporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportTendersCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tenders-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setLastExport(new Date().toLocaleString());
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
        <CardDescription>Download CSV exports for offline analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export tenders CSV"}
        </Button>
        {lastExport ? (
          <p className="text-xs text-slate-400">Last export: {lastExport}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
