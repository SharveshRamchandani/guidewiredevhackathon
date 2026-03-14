/**
 * Registration Step 5 — Plan Selection & Mock Payment
 * Route: /register/plan
 *
 * Shown after UPI setup. Worker selects a plan, a mock UPI payment is
 * processed, and the chosen plan is stored in the auth store context.
 * Only after successful payment does completeRegistration fire and the
 * worker account gets created.
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Shield, Check, Loader2, CreditCard, CheckCircle2,
    ArrowLeft, Zap, Star, Trophy, X
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { paymentApi, workerApi, ApiError } from "@/lib/api";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface CoverageEvent {
    maxPayout: number;
    coPay: number;
    requiresOrderProof?: boolean;
}

interface Plan {
    id: string;
    name: string;
    base_premium: string | number;
    max_payout: string | number;
    coverage_days: number;
    coverage_config: Record<string, CoverageEvent> | string;
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

const PLAN_META: Record<string, {
    badge: string;
    tagline: string;
    recommended: boolean;
    gradient: string;
    icon: React.ReactNode;
    badgeClass: string;
}> = {
    nano: {
        badge: "Part-time",
        tagline: "Essential cover for casual riders",
        recommended: false,
        gradient: "from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/30",
        icon: <Shield className="w-5 h-5 text-slate-500" />,
        badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    },
    basic: {
        badge: "Popular",
        tagline: "Solid protection for regular workers",
        recommended: false,
        gradient: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10",
        icon: <Check className="w-5 h-5 text-green-600" />,
        badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    },
    standard: {
        badge: "Best Value ⭐",
        tagline: "Most chosen by full-time delivery partners",
        recommended: true,
        gradient: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10",
        icon: <Star className="w-5 h-5 text-blue-600" />,
        badgeClass: "bg-blue-600 text-white",
    },
    premium: {
        badge: "Power Worker",
        tagline: "Maximum cover for high-earning riders",
        recommended: false,
        gradient: "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10",
        icon: <Trophy className="w-5 h-5 text-orange-500" />,
        badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    },
};

type PaymentPhase = "idle" | "processing" | "success" | "failed";

const RegisterPlan = () => {
    const navigate = useNavigate();
    const { setToken, setWorker, setSelectedPlan } = useWorkerAuthStore();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
    const [error, setError] = useState<string | null>(null);
    const [txnId, setTxnId] = useState<string | null>(null);

    // ── Guard: must come from UPI step ─────────────────────────────────────────
    useEffect(() => {
        const token = sessionStorage.getItem("_regToken");
        const profile = sessionStorage.getItem("_regProfile");
        const aadhaar = sessionStorage.getItem("_regAadhaar");
        const upi = sessionStorage.getItem("_regUpi");
        if (!token || !profile || !aadhaar || !upi) {
            navigate("/register/phone", { replace: true });
        }
    }, [navigate]);

    // ── Fetch available plans ───────────────────────────────────────────────────
    useEffect(() => {
        fetch(`${API_BASE}/api/policy/plans`)
            .then(r => r.json())
            .then(d => {
                if (d.success && Array.isArray(d.data)) setPlans(d.data);
                else setError("Failed to load plans. Please try again.");
            })
            .catch(() => setError("Could not connect to server."))
            .finally(() => setLoading(false));
    }, []);

    const getSelectedPlan = () => plans.find(p => p.id === selectedPlanId) ?? null;

    // ── Handle Purchase → Payment → Registration ────────────────────────────────
    const handlePurchase = async () => {
        const plan = getSelectedPlan();
        if (!plan) return;

        const upi = sessionStorage.getItem("_regUpi");
        const regToken = sessionStorage.getItem("_regToken");
        const profile = JSON.parse(sessionStorage.getItem("_regProfile") ?? "{}");
        const aadhaar = sessionStorage.getItem("_regAadhaar");

        if (!upi || !regToken || !aadhaar) {
            navigate("/register/phone", { replace: true });
            return;
        }

        setError(null);
        setPaymentPhase("processing");

        try {
            // ─── Step A: Process mock payment ────────────────────────────────
            const payment = await paymentApi.processPayment({
                upi_id: upi,
                amount: parseFloat(String(plan.base_premium)),
                plan_id: plan.id,
                plan_name: plan.name,
            });

            setTxnId(payment.transaction_id);
            toast.success(`Payment ₹${plan.base_premium} confirmed! Txn: ${payment.transaction_id}`);

            // ─── Step B: Complete registration (creates worker account) ──────
            const result = await workerApi.completeRegistration(regToken, {
                name: profile.name,
                platform: profile.platform,
                city: profile.city,
                avgWeeklyEarning: profile.earnings,
                aadhaarLast4: aadhaar,
                upiId: upi,
                planId: plan.id,
            });

            // ─── Step C: Store selected plan in global context ───────────────
            setSelectedPlan({
                id: plan.id,
                name: plan.name,
                base_premium: parseFloat(String(plan.base_premium)),
                max_payout: parseFloat(String(plan.max_payout)),
                coverage_days: plan.coverage_days,
                transaction_id: payment.transaction_id,
            });

            // ─── Step D: Issue policy ─────────────────────────────────────────
            // Create policy using the worker's new JWT token
            await fetch(`${API_BASE}/api/policy/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${result.token}`,
                },
                body: JSON.stringify({ plan_id: plan.id }),
            });

            // ─── Step E: Auth + clear session ────────────────────────────────
            setToken(result.token);
            setWorker(result.worker);

            sessionStorage.removeItem("_regToken");
            sessionStorage.removeItem("_regPhone");
            sessionStorage.removeItem("_regProfile");
            sessionStorage.removeItem("_regAadhaar");
            sessionStorage.removeItem("_regUpi");

            setPaymentPhase("success");
            setTimeout(() => navigate("/dashboard"), 2000);

        } catch (err) {
            setPaymentPhase("failed");
            if (err instanceof ApiError) {
                if (err.code === "PAYMENT_FAILED") {
                    setError("Payment failed. Please try again.");
                } else {
                    setError(err.message);
                }
            } else {
                setError("Something went wrong. Please try again.");
            }
        }
    };

    const selectedPlan = getSelectedPlan();

    // ── Loading skeleton ────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-background">
            <div className="sticky top-0 z-50 bg-card border-b">
                <div className="container flex h-14 items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="font-bold font-display">GigShield</span>
                    </Link>
                    <ThemeToggle />
                </div>
                <Progress value={100} className="h-1" />
            </div>
            <div className="container max-w-5xl py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-2xl border-2 bg-card p-5 animate-pulse space-y-3 h-80">
                            <div className="h-4 bg-muted rounded w-2/3" />
                            <div className="h-10 bg-muted rounded w-1/2" />
                            <div className="h-px bg-muted" />
                            {[1, 2, 3].map(j => <div key={j} className="h-3 bg-muted rounded" />)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ── Payment success screen ──────────────────────────────────────────────────
    if (paymentPhase === "success") return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center shadow-2xl border-2 border-green-200 dark:border-green-800">
                <CardContent className="pt-10 pb-8 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold font-display text-green-700 dark:text-green-300">
                            You're Protected! 🎉
                        </h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Payment confirmed & account created. Redirecting to your dashboard…
                        </p>
                    </div>
                    {txnId && (
                        <div className="bg-muted/60 rounded-xl p-3 text-xs font-mono text-muted-foreground break-all">
                            Txn ID: {txnId}
                        </div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Redirecting…</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            {/* ── Header ── */}
            <div className="sticky top-0 z-50 bg-card border-b">
                <div className="container flex h-14 items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="font-bold font-display">GigShield</span>
                    </Link>
                    <ThemeToggle />
                </div>
                <Progress value={100} className="h-1" />
            </div>

            <div className="container max-w-5xl py-8 space-y-6">
                {/* ── Step badge + heading ── */}
                <div className="text-center space-y-2">
                    <Badge variant="outline" className="text-xs font-medium">Step 5 of 5 — Final Step</Badge>
                    <h1 className="text-2xl font-bold font-display">Choose Your Protection Plan</h1>
                    <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                        Select a plan and pay securely via UPI. Your account is created instantly after payment.
                    </p>
                </div>

                {/* ── Error ── */}
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* ── Plans grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plans.map(plan => {
                        const meta = PLAN_META[plan.name] ?? PLAN_META.basic;
                        const coverageConfig = (typeof plan.coverage_config === "string"
                            ? JSON.parse(plan.coverage_config)
                            : plan.coverage_config) as Record<string, CoverageEvent>;
                        const events = Object.entries(coverageConfig ?? {});
                        const isSelected = selectedPlanId === plan.id;
                        const premium = parseFloat(String(plan.base_premium));
                        const maxPayout = parseFloat(String(plan.max_payout));

                        return (
                            <div
                                key={plan.id}
                                onClick={() => {
                                    if (paymentPhase !== "processing") setSelectedPlanId(plan.id);
                                }}
                                className={`
                                  relative flex flex-col rounded-2xl border-2 cursor-pointer overflow-hidden
                                  bg-gradient-to-b ${meta.gradient} transition-all duration-200
                                  ${isSelected
                                        ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "border-border hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                                    }
                                  ${paymentPhase === "processing" ? "opacity-60 cursor-not-allowed" : ""}
                                `}
                            >
                                {/* Recommended ribbon */}
                                {meta.recommended && (
                                    <div className="bg-primary text-primary-foreground text-xs font-bold text-center py-1.5 tracking-wider">
                                        ⭐ RECOMMENDED
                                    </div>
                                )}

                                {/* Selection indicator */}
                                {isSelected && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                        <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                                    </div>
                                )}

                                <div className="flex flex-col flex-1 p-5">
                                    {/* Header */}
                                    <div className="flex items-start gap-2 mb-4">
                                        <div className="mt-0.5">{meta.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-display font-bold text-base capitalize">{plan.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{meta.tagline}</p>
                                        </div>
                                    </div>

                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit mb-3 ${meta.badgeClass}`}>
                                        {meta.badge}
                                    </span>

                                    {/* Price */}
                                    <div className="mb-4">
                                        <div className="flex items-end gap-1">
                                            <span className="text-4xl font-bold font-display leading-none">₹{premium.toFixed(0)}</span>
                                            <span className="text-muted-foreground text-sm mb-1">/week</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Max payout: <span className="font-semibold text-foreground">₹{maxPayout.toLocaleString("en-IN")}</span>
                                        </p>
                                    </div>

                                    <Separator className="mb-4" />

                                    {/* Coverage events */}
                                    <div className="flex-1 space-y-2 mb-4">
                                        {events.slice(0, 4).map(([key, val]) => (
                                            <div key={key} className="flex items-center justify-between gap-1 text-xs">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-3.5 h-3.5 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center shrink-0">
                                                        <Check className="w-2 h-2 text-green-600" strokeWidth={3} />
                                                    </span>
                                                    <span className="text-muted-foreground">{EVENT_LABELS[key] ?? key}</span>
                                                </span>
                                                <span className="font-medium text-foreground whitespace-nowrap">
                                                    ₹{val.maxPayout.toLocaleString("en-IN")}
                                                </span>
                                            </div>
                                        ))}
                                        {events.length > 4 && (
                                            <p className="text-xs text-muted-foreground">+{events.length - 4} more events</p>
                                        )}
                                    </div>

                                    {/* Select button */}
                                    <Button
                                        size="sm"
                                        className="w-full rounded-xl"
                                        variant={isSelected ? "default" : "outline"}
                                        disabled={paymentPhase === "processing"}
                                        onClick={e => { e.stopPropagation(); setSelectedPlanId(plan.id); }}
                                    >
                                        {isSelected ? (
                                            <><Check className="w-3.5 h-3.5 mr-1.5" /> Selected</>
                                        ) : "Select Plan"}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Dialog open={!!selectedPlanId} onOpenChange={(open) => {
                    if (paymentPhase !== "processing") {
                        if (!open) setSelectedPlanId(null);
                    }
                }}>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] border-2 border-primary/20 shadow-2xl">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="font-display flex items-center gap-2 text-xl">
                                <CreditCard className="w-5 h-5 text-primary" />
                                Payment Summary
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Payment will be charged via your UPI ID:&nbsp;
                                <span className="font-medium text-foreground font-mono">
                                    {sessionStorage.getItem("_regUpi") ?? "—"}
                                </span>
                            </DialogDescription>
                        </DialogHeader>

                        {selectedPlan && (
                            <div className="space-y-6 pt-2">
                                <div className="space-y-3 text-sm bg-muted/30 p-4 rounded-2xl border border-border">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Selected Plan</span>
                                        <Badge variant="outline" className="capitalize font-semibold bg-background">{selectedPlan.name}</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Coverage Period</span>
                                        <span className="font-medium">{selectedPlan.coverage_days} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Max Payout</span>
                                        <span className="font-medium">₹{parseFloat(String(selectedPlan.max_payout)).toLocaleString("en-IN")}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-baseline pt-1">
                                        <span className="text-base font-bold">Total Due Today</span>
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-primary">₹{parseFloat(String(selectedPlan.base_premium)).toFixed(2)}</span>
                                            <p className="text-[10px] text-muted-foreground leading-none mt-1">Includes all taxes</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment status indicator */}
                                {paymentPhase === "processing" && (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 animate-in fade-in zoom-in duration-300">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Processing Payment…</p>
                                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Securely connecting to your UPI bank. Please do not refresh.</p>
                                        </div>
                                    </div>
                                )}

                                {paymentPhase === "failed" && (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-in shake duration-500">
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                            <span className="text-xl">❌</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-red-700 dark:text-red-300">Payment Failed</p>
                                            <p className="text-xs text-red-600/70 dark:text-red-400/70">There was an issue processing your request. Please try again.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <Button
                                        id="reg-pay-btn"
                                        size="lg"
                                        className="w-full gap-2 rounded-2xl font-bold py-6 text-lg shadow-lg shadow-primary/20"
                                        onClick={handlePurchase}
                                        disabled={paymentPhase === "processing"}
                                    >
                                        {paymentPhase === "processing" ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
                                        ) : paymentPhase === "failed" ? (
                                            <><Zap className="w-5 h-5" /> Retry Payment</>
                                        ) : (
                                            <><CreditCard className="w-5 h-5" /> Pay & Activate Plan</>
                                        )}
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        className="w-full text-muted-foreground hover:text-foreground"
                                        onClick={() => setSelectedPlanId(null)}
                                        disabled={paymentPhase === "processing"}
                                    >
                                        Cancel and change plan
                                    </Button>
                                </div>

                                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold opacity-70">
                                    <Shield className="w-3 h-3" />
                                    Secure 256-bit Encryption
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ── No plan selected yet navigation ── */}
                <div className="flex gap-3 max-w-sm mx-auto">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate("/register/upi")}
                        disabled={paymentPhase === "processing"}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to UPI Setup
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                    All plans renew weekly · Cancel anytime from your Policy page · Premium may vary based on zone & risk profile
                </p>
            </div>
        </div>
    );
};

export default RegisterPlan;
