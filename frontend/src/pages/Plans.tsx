import { WorkerLayout } from "@/components/WorkerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { Check } from "lucide-react";

interface CoverageEvent {
  maxPayout: number;
  coPay: number;
  requiresOrderProof?: boolean;
}

interface Plan {
  id: string;
  name: string;
  base_premium: string;
  max_payout: string;
  coverage_days: number;
  coverage_config: Record<string, CoverageEvent>;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EVENT_LABELS: Record<string, string> = {
  heavyRain:      "Heavy Rain (>20mm)",
  poorAqi:        "Poor AQI (>300)",
  heatwave:       "Heatwave (>42°C)",
  platformOutage: "Platform Outage (>4hrs)",
  strike:         "Strike / Protest",
  curfew:         "Curfew / Lockdown",
  accident:       "Accident (Order Loss)",
};

const PLAN_META: Record<string, {
  badge: string;
  tagline: string;
  recommended: boolean;
  borderClass: string;
  badgeClass: string;
}> = {
  nano:     { badge: "Part-time",    tagline: "Essential cover for casual riders",              recommended: false, borderClass: "border-border",   badgeClass: "bg-secondary text-secondary-foreground" },
  basic:    { badge: "Popular",      tagline: "Solid protection for regular workers",           recommended: false, borderClass: "border-border",   badgeClass: "bg-green-100 text-green-700" },
  standard: { badge: "Best Value",   tagline: "Most chosen by full-time delivery partners",     recommended: true,  borderClass: "border-primary",  badgeClass: "bg-primary text-primary-foreground" },
  premium:  { badge: "Power Worker", tagline: "Maximum cover for high-earning riders",          recommended: false, borderClass: "border-border",   badgeClass: "bg-orange-100 text-orange-700" },
};

const Plans = () => {
  const navigate = useNavigate();
  const { token } = useWorkerAuthStore();
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/policy/plans`)
      .then(r => r.json())
      .then(d => { if (d.success) setPlans(d.plans); else setError("Failed to load plans"); })
      .catch(() => setError("Could not connect to server"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (planId: string) => {
    if (!token) { navigate("/login"); return; }
    setPurchasing(planId);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/policy/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Plan activated! Redirecting to your policy...");
        setTimeout(() => navigate("/policy"), 1500);
      } else {
        setError(data.message?.toLowerCase().includes("already has an active policy")
          ? "You already have an active policy. Visit Policy page to manage it."
          : data.message || "Failed to purchase plan");
      }
    } catch { setError("Something went wrong. Please try again."); }
    finally   { setPurchasing(null); }
  };

  if (loading) return (
    <WorkerLayout>
      <PageHeader title="Choose a Plan" description="Weekly income protection for gig workers" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl border-2 border-border bg-card p-6 animate-pulse space-y-4">
            <div className="h-5 bg-muted rounded w-2/3" />
            <div className="h-12 bg-muted rounded w-1/2" />
            <div className="h-px bg-muted" />
            {[1,2,3].map(j => <div key={j} className="h-4 bg-muted rounded" />)}
            <div className="h-11 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    </WorkerLayout>
  );

  return (
    <WorkerLayout>
      <div>
        <PageHeader title="Choose a Plan" description="Weekly income protection designed for gig workers in India" />

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const meta   = PLAN_META[plan.name] || PLAN_META.basic;
            const events = Object.entries(plan.coverage_config || {});
            const coPay  = events.length > 0 ? events[0][1].coPay * 100 : 0;
            const isBuying = purchasing === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border-2 ${meta.borderClass} bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}
              >
                {/* Recommended ribbon */}
                {meta.recommended && (
                  <div className="bg-primary text-primary-foreground text-xs font-bold text-center py-2 tracking-wider">
                    ⭐ RECOMMENDED
                  </div>
                )}

                <div className="flex flex-col flex-1 p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="font-display text-xl font-bold capitalize">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{meta.tagline}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2 ${meta.badgeClass}`}>
                      {meta.badge}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-1">
                    <div className="flex items-end gap-1">
                      <span className="text-5xl font-bold font-display leading-none">
                        ₹{parseFloat(plan.base_premium).toFixed(0)}
                      </span>
                      <span className="text-muted-foreground text-sm mb-1">/week</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ≈ ₹{(parseFloat(plan.base_premium) * 4).toFixed(0)}/month
                    </p>
                  </div>

                  <Separator className="my-5" />

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="rounded-xl bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Max Payout</p>
                      <p className="font-bold text-sm">₹{parseFloat(plan.max_payout).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Co-pay</p>
                      <p className="font-bold text-sm">{coPay === 0 ? "None ✅" : `${coPay}%`}</p>
                    </div>
                  </div>

                  {/* Coverage */}
                  <div className="flex-1 mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      Covered events
                    </p>
                    <ul className="space-y-2.5">
                      {events.map(([key, val]) => (
                        <li key={key} className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-green-600" strokeWidth={3} />
                            </span>
                            <span className="text-sm">{EVENT_LABELS[key] || key}</span>
                          </span>
                          <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                            ₹{val.maxPayout.toLocaleString("en-IN")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full h-11 rounded-xl font-semibold"
                    variant={meta.recommended ? "default" : "outline"}
                    disabled={purchasing !== null}
                    onClick={() => handleSelect(plan.id)}
                  >
                    {isBuying ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Activating...
                      </span>
                    ) : `Get ${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} Plan`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          All plans renew weekly · Cancel anytime from your Policy page · Premium may vary based on your zone and risk profile
        </p>
      </div>
    </WorkerLayout>
  );
};

export default Plans;