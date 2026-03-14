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
import { workerApi } from "@/lib/api";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Shield, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Navigate } from "react-router-dom"; 
const Policy = () => {
  const { token, worker } = useWorkerAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPolicies, setAllPolicies] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [autoRenew, setAutoRenew] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState("standard");

  const activePolicy = allPolicies.find((p) => p.status === "active");
  const pastPolicies = allPolicies.filter((p) => p.status !== "active");
  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const coverageConfig = activePolicy?.coverage_snapshot || plans.find((p) => p.id === activePolicy?.plan_id)?.coverage_config || {};
  const coverageData = coverageConfig
    ? Object.entries(coverageConfig).map(([type, config]) => ({
        type,
        payout: `${Math.round((config as any).payoutPercent || 0)}%`,
        max: `₹${Math.round((config as any).maxPayout || 0).toLocaleString()}`,
      }))
    : [];


  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const [policiesRes, plansRes, profileRes] = await Promise.all([
          workerApi.getMyPolicies(token),
          workerApi.getPlans(),
          workerApi.getProfile(token)
        ]);
        const fetchedPolicies = policiesRes.data || [];
        const fetchedPlans = plansRes.data || [];
        let explicitActive = fetchedPolicies.find((p: any) => p.status === "active");
        
        // Fallback cross verification using profile.plan_id
        if (!explicitActive && profileRes.data?.plan_id) {
            const subPlan = fetchedPlans.find((pl: any) => pl.id === profileRes.data.plan_id);
            if (subPlan) {
                const startD = String(profileRes.data.created_at || new Date().toISOString());
                const vPolicy = {
                    id: "virtual-active",
                    policy_number: `AUTO-${String(profileRes.data.id).substring(0,6).toUpperCase() || "NEW"}`,
                    status: "active",
                    plan_id: subPlan.id,
                    plan_name: subPlan.name,
                    premium: (subPlan as any).base_premium || subPlan.weekly_premium,
                    max_coverage: (subPlan as any).max_payout || subPlan.max_coverage,
                    start_date: startD,
                    end_date: new Date(new Date(startD).setDate(new Date(startD).getDate() + 30)).toISOString(),
                    coverage_snapshot: subPlan.coverage_config
                };
                fetchedPolicies.unshift(vPolicy); // put it in front so it's found below
            }
        }
        
        setAllPolicies(fetchedPolicies);
        setPlans(fetchedPlans);
      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Failed to load policies",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);


  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
      <div>
        <PageHeader title="Policy Details" description="Manage your insurance coverage" />

        {error && (
          <div className="mb-6">
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {activePolicy ? (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-lg">{activePolicy.plan_name}</CardTitle>
                  <CardDescription>Policy ID: {activePolicy.policy_number}</CardDescription>
                </div>
                <StatusBadge status={activePolicy.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Premium</span><p className="font-medium">₹{activePolicy.premium}/week</p></div>
                <div><span className="text-muted-foreground">Max Coverage</span><p className="font-medium">₹{Math.round(activePolicy.max_coverage).toLocaleString()}/week</p></div>
                <div><span className="text-muted-foreground">Valid</span><p className="font-medium">{formatDate(activePolicy.start_date)} – {formatDate(activePolicy.end_date)}</p></div>
                <div><span className="text-muted-foreground">Zone</span><p className="font-medium">{(worker as any)?.platform || "Your Platform"}</p></div>
              </div>

            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                <Label>Auto-renew policy</Label>
              </div>
              <Dialog>
               <Button
                  variant="outline"
                    onClick={() => navigate("/plans")}
>
                    <Shield className="h-4 w-4 mr-1" />
                    Upgrade Plan
                </Button>

                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle className="font-display">Choose a Plan</DialogTitle></DialogHeader>
                  <RadioGroup value={selectedPlanId} onValueChange={setSelectedPlanId} className="space-y-3">
                    {plans.map((plan) => (
                      <div key={plan.id} className="flex items-center gap-3 border rounded-lg p-4">
                        <RadioGroupItem value={plan.id} id={plan.id} />
                        <Label htmlFor={plan.id} className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span className="font-semibold">{plan.name}</span>
                            <span className="text-primary font-semibold">₹{Number(plan.base_premium).toLocaleString()}/week</span>
                          </div>
                          <span className="text-sm text-muted-foreground">Max coverage: ₹{Number(plan.max_payout).toLocaleString()}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button className="w-full mt-4">Confirm Upgrade</Button>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
        ) : (
          <Card className="mb-6 p-8 text-center bg-muted/50">
            <p className="text-muted-foreground">You don't have an active policy right now.</p>
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
