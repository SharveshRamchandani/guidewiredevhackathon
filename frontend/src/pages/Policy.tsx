import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { workerDataApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface PolicyData {
  id: string;
  policy_number?: string;
  plan_name?: string;
  premium?: number;
  max_coverage?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  auto_renew?: boolean;
  coverage_snapshot?: Record<string, { payoutPercent?: number; maxPayout?: number }> | string;
}

const Policy = () => {
  const navigate = useNavigate();
  const { token } = useWorkerAuthStore();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [activePolicy, setActivePolicy] = useState<PolicyData | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);

  useEffect(() => {
    if (!token) return;

    const loadPolicies = async () => {
      setLoading(true);
      try {
        const res = await workerDataApi.getMyPolicies(token);
        const all = (res.data || []) as unknown as PolicyData[];
        setPolicies(all);
        const active = all.find((p) => p.status === "active") || null;
        setActivePolicy(active);
        if (active) setAutoRenew(active.auto_renew ?? true);
      } catch (err) {
        console.error("Policy load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPolicies();
  }, [token]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const getCoverageData = (policy: PolicyData) => {
    if (!policy.coverage_snapshot) return [];
    const snapshot = typeof policy.coverage_snapshot === "string"
      ? JSON.parse(policy.coverage_snapshot)
      : policy.coverage_snapshot;
    return Object.entries(snapshot).map(([key, val]: [string, Record<string, unknown>]) => ({
      type: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      payout: `${val.payoutPercent || 0}%`,
      max: `₹${Number(val.maxPayout || 0).toLocaleString("en-IN")}`,
    }));
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Policy Details" description="Manage your insurance coverage" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const pastPolicies = policies.filter((p) => p.status !== "active");
  const coverageData = activePolicy ? getCoverageData(activePolicy) : [];

  return (
      <div>
        <PageHeader title="Policy Details" description="Manage your insurance coverage" />

        {activePolicy ? (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-lg capitalize">{activePolicy.plan_name || "—"} Plan</CardTitle>
                  <CardDescription>Policy ID: {activePolicy.policy_number || activePolicy.id?.slice(0, 8)}</CardDescription>
                </div>
                <StatusBadge status="active" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Premium</span><p className="font-medium">₹{Number(activePolicy.premium || 0).toLocaleString("en-IN")}/week</p></div>
                <div><span className="text-muted-foreground">Max Coverage</span><p className="font-medium">₹{Number(activePolicy.max_coverage || 0).toLocaleString("en-IN")}/week</p></div>
                <div><span className="text-muted-foreground">Valid</span><p className="font-medium">{formatDate(activePolicy.start_date)} – {formatDate(activePolicy.end_date)}</p></div>
                <div><span className="text-muted-foreground">Status</span><p className="font-medium capitalize">{activePolicy.status}</p></div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                  <Label>Auto-renew policy</Label>
                </div>
                <Button variant="outline" onClick={() => navigate("/plans")}>
                  Upgrade Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">No active policy found.</p>
              <Button onClick={() => navigate("/plans")}>Browse Plans</Button>
            </CardContent>
          </Card>
        )}

        {/* Coverage Breakdown */}
        {coverageData.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="font-display text-lg">Coverage Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Disruption Type</TableHead>
                    <TableHead>Payout %</TableHead>
                    <TableHead>Max Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coverageData.map((c) => (
                    <TableRow key={c.type}>
                      <TableCell>{c.type}</TableCell>
                      <TableCell><Badge variant="secondary">{c.payout}</Badge></TableCell>
                      <TableCell>{c.max}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Policy History */}
        {pastPolicies.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Policy History</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {pastPolicies.map((p) => (
                  <AccordionItem key={p.id} value={p.id}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{p.policy_number || p.id?.slice(0, 8)}</span>
                        <span className="text-muted-foreground">{formatDate(p.start_date)} – {formatDate(p.end_date)}</span>
                        <StatusBadge status={p.status as "active" | "expired" | "cancelled"} />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-3 gap-4 text-sm pl-4">
                        <div><span className="text-muted-foreground">Premium</span><p>₹{Number(p.premium || 0).toLocaleString("en-IN")}</p></div>
                        <div><span className="text-muted-foreground">Max Coverage</span><p>₹{Number(p.max_coverage || 0).toLocaleString("en-IN")}</p></div>
                        <div><span className="text-muted-foreground">Plan</span><p className="capitalize">{p.plan_name || "—"}</p></div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
  );
};

export default Policy;
