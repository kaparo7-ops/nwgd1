import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "@/services/mockApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { PipelineChart } from "@/components/charts/pipeline-chart";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/loaders/skeleton";
import { useLanguage } from "@/providers/language-provider";

export function DashboardPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-red-100 bg-red-50 p-10 text-center">
        <h2 className="text-lg font-semibold text-red-600">{t("error")}</h2>
        <Button onClick={() => refetch()}>{t("retry")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {data.metrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-3xl font-bold">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={metric.change >= 0 ? "success" : "danger"}>
                {metric.change >= 0 ? "▲" : "▼"} {metric.change}%
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("pipeline")}</CardTitle>
            <CardDescription>
              Distribution of tenders by lifecycle stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineChart data={data.pipeline} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cashflow</CardTitle>
            <CardDescription>Pipeline vs invoices vs expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <CashflowChart data={data.cashflow} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("notifications")}</CardTitle>
          <CardDescription>{t("viewAll")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-slate-700">
                  {notification.message}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(notification.date).toLocaleString()}
                </div>
              </div>
              <Badge
                variant={
                  notification.level === "danger"
                    ? "danger"
                    : notification.level === "warning"
                    ? "warning"
                    : "info"
                }
              >
                {notification.level}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
