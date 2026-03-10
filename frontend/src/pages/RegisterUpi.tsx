/**
 * Registration Step 4 — UPI Setup & Policy Activation
 * Route: /register/upi
 * Final step: calls the registration API and issues JWT.
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft, Loader2, CheckCircle, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { workerApi, ApiError } from "@/lib/api";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";

const RegisterUpi = () => {
    const navigate = useNavigate();
    const { setToken, setWorker } = useWorkerAuthStore();

    const [upi, setUpi] = useState("");
    const [upiValid, setUpiValid] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Guard
    useEffect(() => {
        const token = sessionStorage.getItem('_regToken');
        const profile = sessionStorage.getItem('_regProfile');
        const aadhaar = sessionStorage.getItem('_regAadhaar');
        if (!token || !profile || !aadhaar) {
            navigate("/register/phone", { replace: true });
        }
    }, [navigate]);

    const handleUpiChange = (v: string) => {
        setUpi(v);
        const upiRegex = /^[\w.\-]+@[\w]+$/;
        setUpiValid(v.length > 3 ? upiRegex.test(v) : null);
    };

    const handleActivate = async () => {
        if (!upiValid) return;
        setLoading(true);
        setError("");

        try {
            const regToken = sessionStorage.getItem('_regToken')!;
            const profile = JSON.parse(sessionStorage.getItem('_regProfile')!);
            const aadhaar = sessionStorage.getItem('_regAadhaar')!;

            const result = await workerApi.completeRegistration(regToken, {
                name: profile.name,
                platform: profile.platform,
                city: profile.city,
                avgWeeklyEarning: profile.earnings,
                aadhaarLast4: aadhaar,
                upiId: upi,
                registrationCode: profile.registrationCode,
            });

            // Clear session storage
            sessionStorage.removeItem('_regToken');
            sessionStorage.removeItem('_regPhone');
            sessionStorage.removeItem('_regProfile');
            sessionStorage.removeItem('_regAadhaar');

            // Store auth token
            setToken(result.token);
            setWorker(result.worker);

            toast.success("🎉 Welcome to GigShield! Your policy is now active.");
            navigate("/dashboard");
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError("Registration failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
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

            <div className="container max-w-lg py-8">
                <Card>
                    <CardHeader>
                        <Badge variant="outline" className="w-fit mb-2">Step 4 of 4</Badge>
                        <CardTitle className="font-display">UPI Setup</CardTitle>
                        <CardDescription>
                            Add your UPI to receive automatic payouts when claims are approved
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                    placeholder="name@upi or name@okicici"
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

                        {/* Premium Preview Card */}
                        <Card className="bg-muted/40 border-dashed">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-display flex items-center gap-2">
                                    <PartyPopper className="h-4 w-4 text-primary" />
                                    Premium Preview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Base Premium</span>
                                    <span>₹29/week</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Zone Risk Adjustment</span>
                                    <span>+₹6</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-semibold">
                                    <span>Total Weekly</span>
                                    <span className="text-primary">₹35/week</span>
                                </div>
                                <Separator />
                                <div className="text-xs text-muted-foreground space-y-1 pt-1">
                                    <p>✓ Heavy Rain coverage up to ₹500</p>
                                    <p>✓ Platform Outage coverage up to ₹600</p>
                                    <p>✓ Poor AQI coverage up to ₹400</p>
                                    <p>✓ Automatic payouts — no claims to file</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => navigate("/register/kyc")}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                            <Button
                                id="reg-activate-btn"
                                size="lg"
                                className="flex-1"
                                onClick={handleActivate}
                                disabled={!upiValid || loading}
                            >
                                {loading ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating...</>
                                ) : (
                                    "Confirm &amp; Activate Policy"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RegisterUpi;
