import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { CloudRain, Thermometer, Wind, AlertTriangle, IndianRupee, Shield, Eye, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { workerDataApi } from "@/lib/api";

const Dashboard = () => {
  const { token, worker } = useWorkerAuthStore();
  const [loading, setLoading] = useState(true);
  const [activePolicy, setActivePolicy] = useState<Record<string, unknown> | null>(null);
  const [recentClaims, setRecentClaims] = useState<Array<Record<string, unknown>>>([]);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState({ totalClaims: 0, totalPayouts: "₹0", approvalRate: "0%" });

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [policiesRes, claimsRes, profileRes, payoutsRes] = await Promise.all([
          workerDataApi.getMyPolicies(token).catch(() => ({ success: false, data: [] })),
          workerDataApi.getMyClaims(token).catch(() => ({ success: false, data: [] })),
          workerDataApi.getProfile(token).catch(() => ({ success: false, data: null })),
          workerDataApi.getMyPayouts(token).catch(() => ({ success: false, data: [] })),
        ]);

        // Active policy
        const policies = policiesRes.data || [];
        const active = policies.find((p: Record<string, unknown>) => p.status === "active") || null;
        setActivePolicy(active);

        // Claims
        const claims = claimsRes.data || [];
        setRecentClaims(claims.slice(0, 5));

        // Profile
        if (profileRes.data) setProfile(profileRes.data);

        // Stats
        const totalClaims = claims.length;
        const approved = claims.filter((c: Record<string, unknown>) => c.status === "approved").length;
        const approvalRate = totalClaims > 0 ? ((approved / totalClaims) * 100).toFixed(1) + "%" : "N/A";
        const payouts = payoutsRes.data || [];
        const totalPaid = payouts
          .filter((p: Record<string, unknown>) => p.status === "completed")
          .reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.amount || 0), 0);

        setStats({
          totalClaims,
          totalPayouts: `₹${totalPaid.toLocaleString("en-IN")}`,
          approvalRate,
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const formatDate = (iso: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const getDaysRemaining = () => {
    if (!activePolicy?.end_date) return { remaining: 0, total: 7 };
    const end = new Date(activePolicy.end_date as string);
    const start = new Date(activePolicy.start_date as string);
    const now = new Date();
    const total = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return { remaining, total };
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description={`Welcome back${worker?.name ? ', ' + worker.name : ''}!`} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const { remaining: daysRemaining, total: daysTotal } = getDaysRemaining();

  return (
      <div>
        <PageHeader title="Dashboard" description={`Welcome back${profile?.name ? ', ' + profile.name : worker?.name ? ', ' + worker.name : ''}!`} />

        {/* Active Policy + Earnings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {activePolicy ? (
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Active Policy
                </CardTitle>
                <StatusBadge status="active" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Policy ID</span><p className="font-medium">{(activePolicy.policy_number as string) || "—"}</p></div>
                  <div><span className="text-muted-foreground">Plan</span><p className="font-medium capitalize">{(activePolicy.plan_name as string) || "—"}</p></div>
                  <div><span className="text-muted-foreground">Premium</span><p className="font-medium">₹{Number(activePolicy.premium || 0).toLocaleString("en-IN")}/week</p></div>
                  <div><span className="text-muted-foreground">Max Coverage</span><p className="font-medium">₹{Number(activePolicy.max_coverage || 0).toLocaleString("en-IN")}/week</p></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Days Remaining</span>
                    <span className="font-medium">{daysRemaining}/{daysTotal}</span>
                  </div>
                  <Progress value={daysTotal > 0 ? (daysRemaining / daysTotal) * 100 : 0} />
                </div>
              </CardContent>
              <CardFooter>
                <Link to="/policy"><Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" /> View Policy Details</Button></Link>
              </CardFooter>
            </Card>
          ) : (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" /> No Active Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">You don't have an active policy. Get protected now!</p>
                <Link to="/plans"><Button>Browse Plans</Button></Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" /> Weekly Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-display text-primary">
                ₹{Number(profile?.avg_weekly_earning || profile?.weekly_earnings || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">avg weekly earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[
            { label: "Total Claims", value: String(stats.totalClaims), sub: "all time" },
            { label: "Total Payouts", value: stats.totalPayouts, sub: "completed" },
            { label: "Approval Rate", value: stats.approvalRate, sub: "lifetime" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold font-display">{s.value}</p>
                <Separator className="my-2" />
                <p className="text-sm text-muted-foreground">{s.label} · {s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Claims */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent Claims</CardTitle>
          </CardHeader>
          <CardContent>
            {recentClaims.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No claims yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentClaims.map((c) => (
                    <TableRow key={c.id as string}>
                      <TableCell className="font-medium">{(c.claim_number as string) || (c.id as string)?.slice(0, 8)}</TableCell>
                      <TableCell>{formatDate(c.created_at as string)}</TableCell>
                      <TableCell>{c.type as string}</TableCell>
                      <TableCell>₹{Number(c.amount || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell><StatusBadge status={c.status as "approved" | "pending" | "rejected"} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Renew Banner */}
        {activePolicy && daysRemaining <= 2 && (
          <Alert className="border-primary/30 bg-primary/5 mb-6">
            <Shield className="h-4 w-4 text-primary" />
            <AlertTitle>Policy Renewal</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your policy expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. Renew now to stay protected.</p>
              <Button size="sm">Renew Now</Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
  );
};

export default Dashboard;
