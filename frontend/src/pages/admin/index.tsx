import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listUsers, resetDemo } from "@/services/mockApi";
import type { User } from "@/utils/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export function AdminPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const { push } = useToast();

  const resetMutation = useMutation({
    mutationFn: resetDemo,
    onSuccess: () => {
      queryClient.invalidateQueries();
      push({ title: "Demo data restored" });
    }
  });

  const handleRoleChange = (user: User, role: User["role"]) => {
    push({ title: `${user.name} role updated to ${role}` });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage application access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data ?? []).map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
              <Select
                value={user.role}
                onChange={(value) => handleRoleChange(user, value as User["role"])}
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "procurement", label: "Procurement" },
                  { value: "finance", label: "Finance" },
                  { value: "project", label: "Project" },
                  { value: "viewer", label: "Viewer" }
                ]}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Platform level preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => resetMutation.mutate()} disabled={resetMutation.isLoading}>
            {resetMutation.isLoading ? "Restoring..." : "Restore demo data"}
          </Button>
          <p className="text-xs text-slate-500">
            Restores the seeded dataset for tenders, projects, suppliers, and invoices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
