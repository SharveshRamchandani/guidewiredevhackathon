import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface CoverageConfig {
  [key: string]: {
    maxPayout: number;
    coPay: number;
  };
}

interface Policy {
  id: string;
  plan_id: string;
  plan_name: string;
  /** Weekly premium — may come as `premium` or `premium_amount` from the API */
  premium: string;
  premium_amount: string;
  max_payout: string;
  status: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  co_payment_percent: string;
  auto_renew: boolean;
  zone_adjustment: string;
  coverage_config: CoverageConfig | null;
}

interface Plan {
  id: string;
  name: string;
  base_premium: string;
  max_payout: string;
}

interface PolicyApiResponse {
  success: boolean;
  policies: Policy[];
  message?: string;
}

interface PlansApiResponse {
  success: boolean;
  plans: Plan[];
  message?: string;
}

interface CreatePolicyResponse {
  success: boolean;
  message?: string;
}

const EVENT_LABELS: Record<string, string> = {
  heavyRain: "Heavy Rain (>20mm)",
  poorAqi: "Poor AQI (>300)",
  heatwave: "Heatwave (>42°C)",
  platformOutage: "Platform Outage (>4hrs)",
  strike: "Strike / Protest",
  curfew: "Curfew / Lockdown",
  accident: "Accident (Order Loss)",
};

const PLAN_NAME_MAP: Record<string, string> = {
  nano: "Nano Plan",
  basic: "Basic Plan",
  standard: "Standard Plan",
  premium: "Premium Plan",
};

// ─── helpers ────────────────────────────────────────────────────────────────

const formatPlanName = (name: string | null | undefined): string => {
  if (!name) return "Unknown Plan";
  return (
    PLAN_NAME_MAP[name.toLowerCase()] ||
    `${name.charAt(0).toUpperCase() + name.slice(1)} Plan`
  );
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Returns the premium string, falling back to premium_amount when premium is empty/null */
const resolvePremium = (policy: Policy): string =>
  policy.premium || policy.premium_amount || "0";

const formatPremium = (premium: string | null | undefined): string => {
  const val = parseFloat(premium ?? "");
  if (isNaN(val)) return "₹—/week";
  return `₹${val.toFixed(0)}/week`;
};

const formatCoverage = (coverage: string | null | undefined): string => {
  const val = parseFloat(coverage ?? "");
  if (isNaN(val)) return "₹—";
  return `₹${val.toLocaleString("en-IN")}`;
};

const getCoverageTypeLabel = (key: string): string =>
  EVENT_LABELS[key] || key;

/** Clamps a percentage to [0, 100] so negative / overflow values don't break the progress bar */
const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, value));

// ─── component ───────────────────────────────────────────────────────────────

const Policy = () => {
  const navigate = useNavigate();
  const { token } = useWorkerAuthStore();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const activePolicy = policies.find((p) => p.status === "active");

  // ── initial data fetch ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/policy/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data: PolicyApiResponse = await res.json();

        if (data.success) {
          setPolicies(data.policies ?? []);
          const active = (data.policies ?? []).find((p) => p.status === "active");
          if (active) {
            setAutoRenew(active.auto_renew);
          }
        } else {
          setError(data.message ?? "Failed to load policy data.");
        }
      } catch (err) {
        console.error("Failed to fetch policy:", err);
        setError("Unable to reach the server. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // ── fetch available plans, returns the list directly to avoid stale state ─
  const fetchPlans = async (): Promise<Plan[]> => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const response = await fetch(`${API_BASE}/api/policy/plans`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data: PlansApiResponse = await response.json();
      if (data.success) {
        const fetchedPlans = data.plans ?? [];
        setPlans(fetchedPlans);
        return fetchedPlans;
      } else {
        setPlansError(data.message ?? "Failed to load plans.");
        return [];
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setPlansError("Unable to load plans. Please try again.");
      return [];
    } finally {
      setPlansLoading(false);
    }
  };

  // ── upgrade dialog: fetch plans THEN pre-select current plan ───────────
  const handleUpgradeClick = async () => {
    setUpgradeDialogOpen(true);
    const fetchedPlans = await fetchPlans(); // use returned value, not stale `plans` state

    if (activePolicy && fetchedPlans.length > 0) {
      const currentPlan = fetchedPlans.find(
        (p) => p.name.toLowerCase() === activePolicy.plan_name?.toLowerCase()
      );
      if (currentPlan) {
        setSelectedPlan(currentPlan.id);
      }
    }
  };

  // ── re-fetch policy list helper ─────────────────────────────────────────
  const refreshPolicies = async (): Promise<Policy[]> => {
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/api/policy/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: PolicyApiResponse = await res.json();
      if (data.success) {
        const updated = data.policies ?? [];
        setPolicies(updated);
        return updated;
      }
    } catch (err) {
      console.error("Failed to refresh policies:", err);
    }
    return [];
  };

  // ── auto-renew toggle ───────────────────────────────────────────────────
  const handleAutoRenewToggle = async () => {
    if (!activePolicy || !token) return;

    const newValue = !autoRenew;
    setRenewing(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/policy/${activePolicy.id}/auto-renew`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ auto_renew: newValue }),
        }
      );

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        // Refresh from server to get the authoritative value
        const updated = await refreshPolicies();
        const active = updated.find((p) => p.status === "active");
        setAutoRenew(active ? active.auto_renew : newValue);
      } else {
        console.error("Auto-renew toggle failed:", data.message);
      }
    } catch (err) {
      console.error("Failed to toggle auto-renew:", err);
      // No optimistic update was made, so no rollback needed
    } finally {
      setRenewing(false);
    }
  };

  // ── plan upgrade ────────────────────────────────────────────────────────
  const handleUpgrade = async () => {
    if (!selectedPlan || !activePolicy || !token) return;

    setUpgrading(true);
    try {
      // Cancel existing active policy
      const cancelRes = await fetch(
        `${API_BASE}/api/policy/${activePolicy.id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!cancelRes.ok) {
        throw new Error(`Cancel failed: server returned ${cancelRes.status}`);
      }

      // Create new policy with selected plan
      const res = await fetch(`${API_BASE}/api/policy/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan_id: selectedPlan }),
      });

      if (!res.ok) {
        throw new Error(`Create failed: server returned ${res.status}`);
      }

      const data: CreatePolicyResponse = await res.json();

      if (data.success) {
        setUpgradeDialogOpen(false);
        setSelectedPlan("");
        const updated = await refreshPolicies();
        const active = updated.find((p) => p.status === "active");
        if (active) setAutoRenew(active.auto_renew);
      } else {
        console.error("Upgrade failed:", data.message);
      }
    } catch (err) {
      console.error("Failed to upgrade:", err);
    } finally {
      setUpgrading(false);
    }
  };

  // ── loading / error states ──────────────────────────────────────────────

  if (loading) {
    return (
      <WorkerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </WorkerLayout>
    );
  }

  if (error) {
    return (
      <WorkerLayout>
        <PageHeader
          title="Policy Details"
          description="Manage your insurance coverage"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                // re-trigger effect by resetting loading — use a small workaround
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </WorkerLayout>
    );
  }

  if (!activePolicy) {
    return (
      <WorkerLayout>
        <div>
          <PageHeader
            title="Policy Details"
            description="Manage your insurance coverage"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You don't have an active policy yet.
              </p>
              <Button onClick={() => navigate("/plans")}>View Plans</Button>
            </CardContent>
          </Card>

          {policies.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  Policy History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {policies.map((policy) => (
                    <AccordionItem key={policy.id} value={policy.id}>
                      <AccordionTrigger>
                        <span className="flex items-center gap-3">
                          {formatPlanName(policy.plan_name)}
                          <StatusBadge
                            status={
                              policy.status === "active"
                                ? "active"
                                : policy.status === "expired"
                                  ? "expired"
                                  : "pending"
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            {formatDate(policy.start_date)} –{" "}
                            {formatDate(policy.end_date)}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Policy ID:
                            </span>{" "}
                            {policy.id.slice(0, 8).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Premium:
                            </span>{" "}
                            {formatPremium(resolvePremium(policy))}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Max Coverage:
                            </span>{" "}
                            {formatCoverage(policy.max_payout)}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
      </WorkerLayout>
    );
  }

  // ── derive coverage breakdown from coverage_config ─────────────────────
  const coverageData =
    activePolicy.coverage_config
      ? Object.entries(activePolicy.coverage_config).map(([key, value]) => ({
        key,
        type: getCoverageTypeLabel(key),
        // coPay is the fraction the worker pays; payout = (1 - coPay)
        payout: `${((1 - value.coPay) * 100).toFixed(0)}%`,
        max: `₹${value.maxPayout.toLocaleString("en-IN")}`,
      }))
      : [];

  // ── progress bar: use actual date range, clamp to [0, 100] ────────────
  const startMs = new Date(activePolicy.start_date).getTime();
  const endMs = new Date(activePolicy.end_date).getTime();
  const totalDays =
    !isNaN(startMs) && !isNaN(endMs) && endMs > startMs
      ? Math.round((endMs - startMs) / (1000 * 60 * 60 * 24))
      : 7;
  const daysRemaining = Math.max(0, activePolicy.days_remaining ?? 0);
  const progressValue = clampPercent((daysRemaining / totalDays) * 100);

  // ── co-payment display ─────────────────────────────────────────────────
  const coPayRaw = parseFloat(activePolicy.co_payment_percent ?? "0");
  const coPayDisplay = isNaN(coPayRaw) || coPayRaw === 0
    ? "None"
    : `${(coPayRaw * 100).toFixed(0)}%`;

  // ── zone adjustment display ────────────────────────────────────────────
  const zoneAdj = parseFloat(activePolicy.zone_adjustment ?? "0");
  const zoneDisplay = isNaN(zoneAdj)
    ? "—"
    : zoneAdj >= 0
      ? `+₹${zoneAdj.toFixed(2)}`
      : `-₹${Math.abs(zoneAdj).toFixed(2)}`;

  return (
      <div>
        <PageHeader
          title="Policy Details"
          description="Manage your insurance coverage"
        />

        {/* ── Active Policy Card ── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg">
                  {formatPlanName(activePolicy.plan_name)}
                </CardTitle>
                <CardDescription>
                  Policy ID: {activePolicy.id.slice(0, 8).toUpperCase()}
                </CardDescription>
              </div>
              <StatusBadge status="active" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Premium</span>
                <p className="font-medium">
                  {formatPremium(resolvePremium(activePolicy))}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Max Coverage</span>
                <p className="font-medium">
                  {formatCoverage(activePolicy.max_payout)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Valid</span>
                <p className="font-medium">
                  {formatDate(activePolicy.start_date)} –{" "}
                  {formatDate(activePolicy.end_date)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Days Remaining</span>
                <p className="font-medium">{daysRemaining} days</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coverage progress</span>
                <span className="font-medium">
                  {Math.round(progressValue)}%
                </span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Co-payment</span>
                <p className="font-medium">{coPayDisplay}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Zone Adjustment</span>
                <p className="font-medium">{zoneDisplay}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRenew}
                  onCheckedChange={handleAutoRenewToggle}
                  disabled={renewing}
                  id="auto-renew-switch"
                />
                <Label htmlFor="auto-renew-switch">
                  {renewing ? "Saving…" : "Auto-renew policy"}
                </Label>
              </div>
              <Button variant="outline" onClick={() => navigate(`/plans?upgrade=true&currentPlan=${activePolicy?.plan_id || ''}`)}>
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Coverage Breakdown Card ── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Coverage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coverageData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Coverage details are not available for this policy.
              </p>
            ) : (
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
                    <TableRow key={c.key}>
                      <TableCell>{c.type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.payout}</Badge>
                      </TableCell>
                      <TableCell>{c.max}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Policy History Card ── */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Policy History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policies.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {policies.map((policy) => (
                  <AccordionItem key={policy.id} value={policy.id}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-3">
                        {formatPlanName(policy.plan_name)}
                        <StatusBadge
                          status={
                            policy.status === "active"
                              ? "active"
                              : policy.status === "expired"
                                ? "expired"
                                : "pending"
                          }
                        />
                        <span className="text-muted-foreground text-sm">
                          {formatDate(policy.start_date)} –{" "}
                          {formatDate(policy.end_date)}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Policy ID:
                          </span>{" "}
                          {policy.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Premium:
                          </span>{" "}
                          {formatPremium(resolvePremium(policy))}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Max Coverage:
                          </span>{" "}
                          {formatCoverage(policy.max_payout)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Days Remaining:
                          </span>{" "}
                          {Math.max(0, policy.days_remaining ?? 0)} days
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-muted-foreground text-sm">
                No policy history available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default Policy;
