/**
 * Registration Step 2 — Profile Setup
 * Route: /register/profile
 * No company/registration code — workers register directly with GigShield.
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
import { Shield, HelpCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    hyderabad: [
        { name: "Hitech City", risk: "low" }, { name: "Kukatpally", risk: "medium" }, { name: "LB Nagar", risk: "high" },
    ],
    chennai: [
        { name: "Anna Nagar", risk: "low" }, { name: "T Nagar", risk: "medium" }, { name: "Tambaram", risk: "high" },
    ],
};

const riskVariant = (risk: string) => {
    if (risk === "high") return "destructive" as const;
    if (risk === "medium") return "secondary" as const;
    return "outline" as const;
};

const RegisterProfile = () => {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [platform, setPlatform] = useState("");
    const [city, setCity] = useState("");
    const [zone, setZone] = useState("");
    const [earnings, setEarnings] = useState("");

    // Guard — must have registration token from Step 1
    useEffect(() => {
        if (!sessionStorage.getItem('_regToken')) {
            navigate("/register/phone", { replace: true });
        }
    }, [navigate]);

    // No registration code — workers register directly with GigShield
    const canProceed = name && platform && city && zone && earnings;

    const handleNext = () => {
        if (!canProceed) return;
        sessionStorage.setItem('_regProfile', JSON.stringify({
            name,
            platform,
            city,
            zone,
            earnings: Number(earnings),
            // No registrationCode
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
                        <CardDescription>Tell us about yourself and your delivery work</CardDescription>
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
                                    <SelectItem value="hyderabad">Hyderabad</SelectItem>
                                    <SelectItem value="chennai">Chennai</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Zone (loads on city change) */}
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
                                        Your weekly earnings help us calculate the right coverage amount for your GigShield plan.
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
