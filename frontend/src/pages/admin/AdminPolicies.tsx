import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { adminDataApi } from "@/lib/api";

interface PolicyData {
  id: string;
  policy_number?: string;
  worker_name?: string;
  worker_phone?: string;
  plan_name?: string;
  premium?: number;
  max_coverage?: number;
  status: string;
  auto_renew?: boolean;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

const AdminPolicies = () => {
  const { token } = useAdminAuthStore();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [selected, setSelected] = useState<PolicyData | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!token) return;

    const loadPolicies = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { limit: "50" };
        if (statusFilter !== "all") params.status = statusFilter;
        const res = await adminDataApi.getPolicies(token, params);
        setPolicies((res.data || []) as unknown as PolicyData[]);
      } catch (err) {
        console.error("Admin policies load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPolicies();
  }, [token, statusFilter]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatDateShort = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <>
      <PageHeader title="Policies Management" description="View and manage all worker policies">
        <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : policies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No policies found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy ID</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auto-Renew</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.policy_number || p.id.slice(0, 8)}</TableCell>
                    <TableCell>{p.worker_name || "—"}</TableCell>
                    <TableCell className="capitalize">{p.plan_name || "—"}</TableCell>
                    <TableCell>₹{Number(p.premium || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateShort(p.start_date)} – {formatDateShort(p.end_date)}</TableCell>
                    <TableCell><StatusBadge status={p.status as "active" | "expired" | "cancelled"} /></TableCell>
                    <TableCell><Switch checked={p.auto_renew ?? false} /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setSelected(p)}>View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Policy {selected?.policy_number || selected?.id?.slice(0, 8)}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {[
                ["Worker", selected.worker_name || "—"],
                ["Phone", selected.worker_phone || "—"],
                ["Plan", (selected.plan_name || "—")],
                ["Premium", `₹${Number(selected.premium || 0).toLocaleString("en-IN")}`],
                ["Max Coverage", `₹${Number(selected.max_coverage || 0).toLocaleString("en-IN")}`],
                ["Period", `${formatDate(selected.start_date)} – ${formatDate(selected.end_date)}`],
              ].map(([k, v]) => (
                <div key={k as string}><div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="capitalize">{v}</span></div><Separator className="mt-2" /></div>
              ))}
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status as "active" | "expired" | "cancelled"} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPolicies;
