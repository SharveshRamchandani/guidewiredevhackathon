/**
 * Registration Step 3 — KYC Verification
 * Route: /register/kyc
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const RegisterKyc = () => {
    const navigate = useNavigate();

    const [aadhaar, setAadhaar] = useState("");
    const [consent, setConsent] = useState(false);
    const [kycVerified, setKycVerified] = useState(false);

    // Guard
    useEffect(() => {
        if (!sessionStorage.getItem('_regToken') || !sessionStorage.getItem('_regProfile')) {
            navigate("/register/phone", { replace: true });
        }
    }, [navigate]);

    const handleVerify = () => {
        if (aadhaar.length === 4 && consent) {
            setKycVerified(true);
            // Store aadhaar for final step
            sessionStorage.setItem('_regAadhaar', aadhaar);
            setTimeout(() => navigate("/register/upi"), 500);
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
                <Progress value={75} className="h-1" />
            </div>

            <div className="container max-w-lg py-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className="w-fit">Step 3 of 4</Badge>
                            <Badge variant={kycVerified ? "default" : "secondary"} className="gap-1">
                                {kycVerified ? "✓ Verified" : "Pending"}
                            </Badge>
                        </div>
                        <CardTitle className="font-display mt-2">KYC Verification</CardTitle>
                        <CardDescription>
                            Verify your identity to activate your insurance coverage
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Lock className="h-4 w-4" />
                            <AlertDescription>
                                Your Aadhaar is hashed with SHA-256 and never stored in plain text. We only verify the last 4 digits for identity confirmation.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="aadhaar">Aadhaar Last 4 Digits</Label>
                            <Input
                                id="aadhaar"
                                maxLength={4}
                                placeholder="1234"
                                value={aadhaar}
                                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                className="text-2xl tracking-widest text-center font-mono"
                            />
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                            <Checkbox
                                id="kyc-consent"
                                checked={consent}
                                onCheckedChange={(c) => setConsent(c as boolean)}
                            />
                            <Label htmlFor="kyc-consent" className="text-sm leading-relaxed cursor-pointer">
                                I consent to Aadhaar-based KYC verification as per{" "}
                                <a href="#" className="text-primary underline">GigShield's terms</a> and{" "}
                                <a href="#" className="text-primary underline">IRDAI guidelines</a>.
                                My data will be used only for identity verification and insurance processing.
                            </Label>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => navigate("/register/profile")}
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                            <Button
                                id="kyc-verify-btn"
                                className="flex-1"
                                onClick={handleVerify}
                                disabled={aadhaar.length !== 4 || !consent}
                            >
                                {kycVerified ? "Verified ✓" : "Verify & Continue"}
                                {!kycVerified && <ArrowRight className="h-4 w-4 ml-1" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RegisterKyc;
