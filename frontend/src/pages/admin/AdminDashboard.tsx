import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, IndianRupee, FileText, ShieldAlert, Loader2, Radar, Siren } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { adminDataApi } from "@/lib/api";

interface DashboardKpis {
  workers: { total: number; verified: number };
  policies: { total: number; active: number; premium_collected: number };
  claims: { total: number; pending: number; approved: number; fraud_flagged: number };
  payouts: { total_paid: number };
  events_last_24h: number;
}

interface ClaimRow {
  id: string;
  claim_number?: string;
  worker_name?: string;
  type: string;
  fraud_score: number;
  status: string;
  zone_name?: string;
}

interface ExposureZone {
  zone_id: string;
  zone_name: string;
  city_name?: string;
  active_workers: number;
  active_policies: number;
  pending_claims: number;
  events_last_7d: number;
  projected_auto_payout_load: number;
  exposure_score: number;
  severity_band: "stable" | "elevated" | "surge";
}

const AdminDashboard = () => {
  const { token } = useAdminAuthStore();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [recentClaims, setRecentClaims] = useState<ClaimRow[]>([]);
  const [exposureRadar, setExposureRadar] = useState<{ top_zones?: ExposureZone[]; platform_totals?: { monitored_zones?: number; zones_in_surge?: number; zones_elevated?: number } } | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [dashRes, claimsRes, radarRes] = await Promise.all([
          adminDataApi.getDashboard(token).catch(() => ({ success: false, data: null })),
          adminDataApi.getClaims(token, { limit: "5" }).catch(() => ({ success: false, data: [] })),
          adminDataApi.getExposureRadar(token).catch(() => ({ success: false, data: null })),
        ]);

        if (dashRes.data) setKpis(dashRes.data as unknown as DashboardKpis);
        setRecentClaims((claimsRes.data || []) as unknown as ClaimRow[]);
        setExposureRadar((radarRes.data || null) as { top_zones?: ExposureZone[]; platform_totals?: { monitored_zones?: number; zones_in_surge?: number; zones_elevated?: number } } | null);
      } catch (err) {
        console.error("Admin dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  if (loading) {
    return (
      <>
        <PageHeader title="Admin Dashboard" description="Overview of Kintsu operations" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  const kpiCards = [
    { label: "Active Workers", value: kpis?.workers.total?.toLocaleString("en-IN") || "0", icon: Users },
    { label: "Premium Collected", value: `₹${(kpis?.policies.premium_collected || 0).toLocaleString("en-IN")}`, icon: IndianRupee },
    { label: "Pending Claims", value: String(kpis?.claims.pending || 0), icon: FileText },
    { label: "Fraud Flagged", value: String(kpis?.claims.fraud_flagged || 0), icon: ShieldAlert },
  ];

  const handleApprove = async (claimId: string) => {
    if (!token) return;
    try {
      await adminDataApi.approveClaim(claimId, token);
      setRecentClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, status: "approved" } : c));
    } catch (err) {
      console.error("Approve error:", err);
    }
  };

  const handleReject = async (claimId: string) => {
    if (!token) return;
    try {
      await adminDataApi.rejectClaim(claimId, "Rejected from dashboard", token);
      setRecentClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, status: "rejected" } : c));
    } catch (err) {
      console.error("Reject error:", err);
    }
  };

  return (
    <>
      <PageHeader title="Admin Dashboard" description="Overview of Kintsu operations" />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-display">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Policies</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{kpis?.policies.total || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-medium">{kpis?.policies.active || 0}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Claims</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{kpis?.claims.total || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span className="font-medium">{kpis?.claims.approved || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="font-medium">{kpis?.claims.pending || 0}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Payouts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Paid</span><span className="font-medium">₹{(kpis?.payouts.total_paid || 0).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Events (24h)</span><span className="font-medium">{kpis?.events_last_24h || 0}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Radar className="h-5 w-5 text-primary" /> Exposure Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(exposureRadar?.top_zones?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No zone exposure data available yet.</p>
            ) : (
              exposureRadar?.top_zones?.map((zone) => (
                <div key={zone.zone_id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{zone.zone_name}</p>
                      <p className="text-sm text-muted-foreground">{zone.city_name || "Unknown city"}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        zone.severity_band === "surge"
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : zone.severity_band === "elevated"
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : "border-success/30 bg-success/10 text-success"
                      }
                    >
                      {zone.severity_band}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                    <div><p className="text-muted-foreground">Workers</p><p className="font-semibold">{zone.active_workers}</p></div>
                    <div><p className="text-muted-foreground">Policies</p><p className="font-semibold">{zone.active_policies}</p></div>
                    <div><p className="text-muted-foreground">Pending Claims</p><p className="font-semibold">{zone.pending_claims}</p></div>
                    <div><p className="text-muted-foreground">Events (7d)</p><p className="font-semibold">{zone.events_last_7d}</p></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Exposure Score</span>
                    <span className="font-semibold">{zone.exposure_score}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Projected Auto Payout Load</span>
                    <span className="font-semibold">₹{Number(zone.projected_auto_payout_load || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Siren className="h-5 w-5 text-primary" /> Control Tower
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-muted-foreground">Monitored Zones</p>
              <p className="text-3xl font-bold font-display">{exposureRadar?.platform_totals?.monitored_zones ?? 0}</p>
            </div>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-muted-foreground">Surge Zones</p>
              <p className="text-2xl font-bold font-display">{exposureRadar?.platform_totals?.zones_in_surge ?? 0}</p>
            </div>
            <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
              <p className="text-muted-foreground">Elevated Zones</p>
              <p className="text-2xl font-bold font-display">{exposureRadar?.platform_totals?.zones_elevated ?? 0}</p>
            </div>
            <p className="text-muted-foreground">
              Exposure Radar estimates where a new disruption would create the fastest claim and payout surge across the portfolio.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Claims Queue */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="font-display text-lg">Recent Claims Queue</CardTitle></CardHeader>
        <CardContent>
          {recentClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No claims found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fraud Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentClaims.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.claim_number || c.id.slice(0, 8)}</TableCell>
                    <TableCell>{c.worker_name || "—"}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={(c.fraud_score || 0) < 30 ? "low" : (c.fraud_score || 0) < 60 ? "medium" : "high"}
                        label={`${c.fraud_score || 0}%`}
                      />
                    </TableCell>
                    <TableCell><StatusBadge status={c.status as "approved" | "pending" | "rejected"} /></TableCell>
                    <TableCell>
                      {c.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-success h-7 px-2" onClick={() => handleApprove(c.id)}>Approve</Button>
                          <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => handleReject(c.id)}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AdminDashboard;
