import { WorkerLayout } from "@/components/WorkerLayout";
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
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";

interface CoverageConfig {
  [key: string]: {
    maxPayout: number;
    coPay: number;
  };
}

interface Policy {
  id: string;
  plan_name: string;
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
  coverage_config: CoverageConfig;
}

interface PolicyApiResponse {
  success: boolean;
  policies: Policy[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Policy = () => {
  const navigate = useNavigate();
  const { token } = useWorkerAuthStore();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    const fetchPolicy = async () => {
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
        const data: PolicyApiResponse = await res.json();

        if (data.success && data.policies.length > 0) {
          const activePolicy = data.policies.find(p => p.status === 'active');
          if (activePolicy) {
            setPolicy(activePolicy);
            setAutoRenew(activePolicy.auto_renew);
          }
        }
      } catch (err) {
        console.error('Failed to fetch policy:', err);
        setError('Failed to load policy data');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [token]);

  const handleAutoRenewToggle = async () => {
    if (!policy || !token) return;

    setRenewing(true);
    try {
      const res = await fetch(`${API_BASE}/api/policy/${policy.id}/renew`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (data.success) {
        setAutoRenew(!autoRenew);
        // Refresh policy data
        const refreshRes = await fetch(`${API_BASE}/api/policy/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const refreshData: PolicyApiResponse = await refreshRes.json();
        if (refreshData.success && refreshData.policies.length > 0) {
          const activePolicy = refreshData.policies.find(p => p.status === 'active');
          if (activePolicy) {
            setPolicy(activePolicy);
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle auto-renew:', err);
    } finally {
      setRenewing(false);
    }
  };

  const formatPlanName = (name: string): string => {
    const nameMap: Record<string, string> = {
      basic: 'Basic Weekly Plan',
      standard: 'Standard Weekly Plan',
      premium: 'Premium Weekly Plan',
    };
    return nameMap[name] || `${name.charAt(0).toUpperCase() + name.slice(1)} Weekly Plan`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatPremium = (premium: string): string => {
    return `₹${parseFloat(premium).toFixed(0)}/week`;
  };

  const formatCoverage = (coverage: string): string => {
    return `₹${parseFloat(coverage).toLocaleString('en-IN')}`;
  };

  const getCoverageTypeLabel = (key: string): string => {
    const labels: Record<string, string> = {
      heavyRain: 'Heavy Rain (>20mm)',
      poorAqi: 'Poor AQI (>300)',
      heatwave: 'Heatwave (>42°C)',
      platformOutage: 'Platform Outage (>2hr)',
      strike: 'Strike',
      curfew: 'Curfew',
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <WorkerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </WorkerLayout>
    );
  }

  if (!policy) {
    return (
      <WorkerLayout>
        <div>
          <PageHeader title="Policy Details" description="Manage your insurance coverage" />
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You don't have an active policy yet.</p>
              <Button onClick={() => navigate('/plans')}>View Plans</Button>
            </CardContent>
          </Card>
        </div>
      </WorkerLayout>
    );
  }

  const coverageData = policy.coverage_config 
    ? Object.entries(policy.coverage_config).map(([key, value]) => ({
        type: getCoverageTypeLabel(key),
        payout: `${((1 - value.coPay) * 100).toFixed(0)}%`,
        max: `₹${value.maxPayout.toLocaleString('en-IN')}`,
      }))
    : [];

  return (
    <WorkerLayout>
      <div>
        <PageHeader title="Policy Details" description="Manage your insurance coverage" />

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg">{formatPlanName(policy.plan_name)}</CardTitle>
                <CardDescription>Policy ID: {policy.id.slice(0, 8).toUpperCase()}</CardDescription>
              </div>
              <StatusBadge status={policy.status as 'active' | 'expired'} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Premium</span><p className="font-medium">{formatPremium(policy.premium)}</p></div>
              <div><span className="text-muted-foreground">Max Coverage</span><p className="font-medium">{formatCoverage(policy.max_payout)}</p></div>
              <div><span className="text-muted-foreground">Valid</span><p className="font-medium">{formatDate(policy.start_date)} – {formatDate(policy.end_date)}</p></div>
              <div><span className="text-muted-foreground">Days Remaining</span><p className="font-medium">{policy.days_remaining} days</p></div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={autoRenew} 
                  onCheckedChange={handleAutoRenewToggle} 
                  disabled={renewing}
                />
                <Label>Auto-renew policy</Label>
              </div>
              <Dialog>
                <DialogTrigger asChild><Button variant="outline">Upgrade Plan</Button></DialogTrigger>
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
            <p className="text-muted-foreground text-sm">View your past policies in the claims section.</p>
          </CardContent>
        </Card>
      </div>
    </WorkerLayout>
  );
};

export default Policy;

