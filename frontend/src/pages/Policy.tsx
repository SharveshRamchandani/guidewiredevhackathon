import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { workerApi } from "@/lib/api";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Shield, Eye } from "lucide-react";

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

  const pastPolicies = allPolicies
    .filter((p) => p.status !== "active")
    .slice(0, 5)
    .map((p) => ({
      id: p.policy_number,
      period: `${new Date(p.start_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(p.end_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`,
      premium: `₹${p.premium}`,
      claims: 0, // TODO: aggregate from claims API
      payout: "₹0", // TODO: sum payouts
    }));

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
        const [policiesRes, plansRes] = await Promise.all([
          workerApi.getMyPolicies(token),
          workerApi.getPlans(),
        ]);
        setAllPolicies(policiesRes.data || []);
        setPlans(plansRes.data || []);
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
                <div><span className="text-muted-foreground">Valid</span><p className="font-medium">{new Date(activePolicy.start_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – {new Date(activePolicy.end_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</p></div>
                <div><span className="text-muted-foreground">Zone</span><p className="font-medium">{worker?.platform || "Your Zone"}</p></div>
              </div>

            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                <Label>Auto-renew policy</Label>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-1" />
                    Upgrade Plan
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle className="font-display">Choose a Plan</DialogTitle></DialogHeader>
                  <RadioGroup defaultValue="standard" className="space-y-3">
                    {[
                      { value: "basic", label: "Basic", price: "₹19/week", coverage: "₹1,000" },
                      { value: "standard", label: "Standard", price: "₹35/week", coverage: "₹2,000" },
                      { value: "premium", label: "Premium", price: "₹59/week", coverage: "₹5,000" },
                    ].map((plan) => (
                      <div key={plan.value} className="flex items-center gap-3 border rounded-lg p-4">
                        <RadioGroupItem value={plan.value} id={plan.value} />
                        <Label htmlFor={plan.value} className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span className="font-semibold">{plan.label}</span>
                            <span className="text-primary font-semibold">{plan.price}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">Max coverage: {plan.coverage}</span>
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

        {/* Policy History */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Policy History</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {pastPolicies.map((p) => (
                <AccordionItem key={p.id} value={p.id}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{p.id}</span>
                      <span className="text-muted-foreground">{p.period}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-3 gap-4 text-sm pl-4">
                      <div><span className="text-muted-foreground">Premium</span><p>{p.premium}</p></div>
                      <div><span className="text-muted-foreground">Claims</span><p>{p.claims}</p></div>
                      <div><span className="text-muted-foreground">Total Payout</span><p>{p.payout}</p></div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
  );
};

export default Policy;
