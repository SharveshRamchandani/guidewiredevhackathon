/**
 * Registration Step 2 — Profile Setup
 * Route: /register/profile
 * Includes registration code validation that links worker to admin tenant.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, HelpCircle, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { workerApi, ApiError } from "@/lib/api";

const zones: Record<string, { name: string; risk: "low" | "medium" | "high" }[]> = {
    mumbai: [
        { name: "Andheri", risk: "medium" }, { name: "Bandra", risk: "high" }, { name: "Dadar", risk: "low" },
    ],
    delhi: [
        { name: "Connaught Place", risk: "low" }, { name: "Dwarka", risk: "medium" }, { name: "Rohini", risk: "high" },
    ],
    bangalore: [
        { name: "Koramangala", risk: "low" }, { name: "Whitefield", risk: "medium" }, { name: "Electronic City", risk: "high" },
    ],
};

const riskVariant = (risk: string) => {
    if (risk === "high") return "destructive" as const;
    if (risk === "medium") return "secondary" as const;
    return "outline" as const;
};

type CodeValidState = null | 'valid' | 'invalid' | 'checking';

const RegisterProfile = () => {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [platform, setPlatform] = useState("");
    const [city, setCity] = useState("");
    const [zone, setZone] = useState("");
    const [earnings, setEarnings] = useState("");
    const [registrationCode, setRegistrationCode] = useState("");
    const [codeState, setCodeState] = useState<CodeValidState>(null);
    const [codeCompanyName, setCodeCompanyName] = useState("");
    const [codeError, setCodeError] = useState("");

    // Guard — must have registration token
    useEffect(() => {
        if (!sessionStorage.getItem('_regToken')) {
            navigate("/register/phone", { replace: true });
        }
    }, [navigate]);

    const validateCode = async () => {
        if (!registrationCode.trim()) return;
        setCodeState('checking');
        setCodeCompanyName("");
        setCodeError("");

        try {
            const result = await workerApi.validateCode(registrationCode.trim());
            if (result.valid) {
                setCodeState('valid');
                setCodeCompanyName(result.companyName || "");
            } else {
                setCodeState('invalid');
                setCodeError("Invalid code. Check with your delivery platform.");
            }
        } catch {
            setCodeState('invalid');
            setCodeError("Unable to validate code. Please try again.");
        }
    };

    const canProceed = name && platform && city && zone && earnings && codeState === 'valid';

    const handleNext = () => {
        if (!canProceed) return;
        // Store profile data in sessionStorage for next steps
        sessionStorage.setItem('_regProfile', JSON.stringify({
            name, platform, city, zone, earnings: Number(earnings), registrationCode: registrationCode.trim().toUpperCase(),
        }));
        navigate("/register/kyc");
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
                <Progress value={50} className="h-1" />
            </div>

            <div className="container max-w-lg py-8">
                <Card>
                    <CardHeader>
                        <Badge variant="outline" className="w-fit mb-2">Step 2 of 4</Badge>
                        <CardTitle className="font-display">Profile Setup</CardTitle>
                        <CardDescription>Tell us about yourself and your delivery platform</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="reg-name">Full Name</Label>
                            <Input
                                id="reg-name"
                                placeholder="Ramesh Kumar"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* Platform */}
                        <div className="space-y-2">
                            <Label>Delivery Platform</Label>
                            <ToggleGroup
                                type="single"
                                value={platform}
                                onValueChange={setPlatform}
                                className="grid grid-cols-2 gap-2"
                            >
                                {["Swiggy", "Zomato", "Amazon", "Zepto"].map((p) => (
                                    <ToggleGroupItem
                                        key={p}
                                        value={p.toLowerCase()}
                                        className="border rounded-lg py-3 data-[state=on]:bg-primary/10 data-[state=on]:border-primary"
                                    >
                                        {p}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>

                        {/* City */}
                        <div className="space-y-2">
                            <Label>City</Label>
                            <Select value={city} onValueChange={(v) => { setCity(v); setZone(""); }}>
                                <SelectTrigger id="reg-city">
                                    <SelectValue placeholder="Select your city" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mumbai">Mumbai</SelectItem>
                                    <SelectItem value="delhi">Delhi</SelectItem>
                                    <SelectItem value="bangalore">Bangalore</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Zone */}
                        {city && (
                            <div className="space-y-2">
                                <Label>Zone</Label>
                                <Select value={zone} onValueChange={setZone}>
                                    <SelectTrigger id="reg-zone">
                                        <SelectValue placeholder="Select your zone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {zones[city]?.map((z) => (
                                            <SelectItem key={z.name} value={z.name.toLowerCase()}>
                                                <span className="flex items-center gap-2">
                                                    {z.name}{" "}
                                                    <Badge variant={riskVariant(z.risk)} className="text-xs">
                                                        {z.risk} risk
                                                    </Badge>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Earnings */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="reg-earnings">Avg Weekly Earnings (₹)</Label>
                                <HoverCard>
                                    <HoverCardTrigger>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </HoverCardTrigger>
                                    <HoverCardContent className="text-sm">
                                        Your weekly earnings help us calculate the right coverage amount for your plan.
                                    </HoverCardContent>
                                </HoverCard>
                            </div>
                            <Input
                                id="reg-earnings"
                                type="number"
                                placeholder="5000"
                                value={earnings}
                                onChange={(e) => setEarnings(e.target.value)}
                                min={0}
                            />
                        </div>

                        {/* Registration Code */}
                        <div className="space-y-2">
                            <Label htmlFor="reg-code">Company Registration Code</Label>
                            <div className="relative">
                                <Input
                                    id="reg-code"
                                    placeholder="e.g. SWFT2026"
                                    value={registrationCode}
                                    onChange={(e) => {
                                        setRegistrationCode(e.target.value.toUpperCase());
                                        setCodeState(null);
                                        setCodeCompanyName("");
                                        setCodeError("");
                                    }}
                                    onBlur={validateCode}
                                    className="uppercase pr-10"
                                    maxLength={10}
                                />
                                {codeState === 'checking' && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                {codeState === 'valid' && (
                                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                )}
                                {codeState === 'invalid' && (
                                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                                )}
                            </div>
                            {codeState === 'valid' && codeCompanyName && (
                                <Badge variant="outline" className="text-green-600 border-green-500">
                                    ✓ Valid Company: {codeCompanyName}
                                </Badge>
                            )}
                            {codeState === 'invalid' && (
                                <Badge variant="destructive" className="text-xs">{codeError}</Badge>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Your delivery company will provide this code. It links your account to your insurance provider.
                            </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => navigate("/register/phone")}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                            <Button
                                id="reg-profile-next-btn"
                                className="flex-1"
                                onClick={handleNext}
                                disabled={!canProceed}
                            >
                                Next <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RegisterProfile;
