/**
 * Registration Step 4 — UPI Setup
 * Route: /register/upi
 *
 * Worker enters their UPI ID. On confirmation, UPI is saved to sessionStorage
 * and the worker proceeds to Step 5 (Plan Selection & Payment).
 * Account creation happens only after plan payment in /register/plan.
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft, ArrowRight, CheckCircle, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const RegisterUpi = () => {
    const navigate = useNavigate();

    const [upi, setUpi] = useState("");
    const [upiValid, setUpiValid] = useState<boolean | null>(null);
    const [error, setError] = useState("");

    // Guard — must come from KYC step
    useEffect(() => {
        const token = sessionStorage.getItem("_regToken");
        const profile = sessionStorage.getItem("_regProfile");
        const aadhaar = sessionStorage.getItem("_regAadhaar");
        if (!token || !profile || !aadhaar) {
            navigate("/register/phone", { replace: true });
        }
    }, [navigate]);

    const handleUpiChange = (v: string) => {
        setUpi(v);
        const upiRegex = /^[\w.\-]+@[\w]+$/;
        setUpiValid(v.length > 3 ? upiRegex.test(v) : null);
    };

    /** Save UPI to session and proceed to plan selection */
    const handleNext = () => {
        if (!upiValid) return;
        sessionStorage.setItem("_regUpi", upi);
        navigate("/register/plan");
    };

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
                {/* 4/5 = 80% */}
                <Progress value={80} className="h-1" />
            </div>

            <div className="container max-w-lg py-8">
                <Card>
                    <CardHeader>
                        <Badge variant="outline" className="w-fit mb-2">Step 4 of 5</Badge>
                        <CardTitle className="font-display">UPI Setup</CardTitle>
                        <CardDescription>
                            Add your UPI ID to receive automatic payouts when claims are approved
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* UPI Input */}
                        <div className="space-y-2">
                            <Label htmlFor="reg-upi">UPI ID</Label>
                            <div className="relative">
                                <Input
                                    id="reg-upi"
                                    placeholder="name@okicici or name@upi"
                                    value={upi}
                                    onChange={(e) => handleUpiChange(e.target.value)}
                                    className="pr-24"
                                />
                                {upiValid !== null && (
                                    <Badge
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                                        variant={upiValid ? "outline" : "destructive"}
                                    >
                                        {upiValid ? (
                                            <><CheckCircle className="h-3 w-3 mr-1" /> Valid</>
                                        ) : (
                                            "Invalid"
                                        )}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Format: yourname@bankname (e.g. ramesh@okicici)
                            </p>
                        </div>

                        {/* Info card */}
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Wallet className="h-4 w-4 text-primary" />
                                How UPI payouts work
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-1.5">
                                <li>✓ Payouts sent automatically within minutes of a triggered event</li>
                                <li>✓ No need to file a claim — GigShield detects disruptions for you</li>
                                <li>✓ Compatible with all major UPI apps (GPay, PhonePe, Paytm, BHIM)</li>
                                <li>✓ Your UPI ID is encrypted and stored securely</li>
                            </ul>
                        </div>

                        {/* What comes next */}
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                            <p className="font-medium text-primary mb-1">📋 Next: Choose Your Plan</p>
                            <p className="text-xs text-muted-foreground">
                                After entering your UPI ID, you'll select a protection plan and complete a
                                mock UPI payment. Your account is created only after successful payment.
                            </p>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => navigate("/register/kyc")}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                            <Button
                                id="reg-upi-next-btn"
                                size="lg"
                                className="flex-1"
                                onClick={handleNext}
                                disabled={!upiValid}
                            >
                                Next — Choose Plan <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RegisterUpi;
