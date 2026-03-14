import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Shield, HelpCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
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
};

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(() => Number(sessionStorage.getItem("reg_step")) || 1);
  const [phone, setPhone] = useState(() => sessionStorage.getItem("reg_phone") || "");
  const [otpSent, setOtpSent] = useState(() => sessionStorage.getItem("reg_otpSent") === "true");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState(() => sessionStorage.getItem("reg_name") || "");
  const [platform, setPlatform] = useState(() => sessionStorage.getItem("reg_platform") || "");
  const [city, setCity] = useState(() => sessionStorage.getItem("reg_city") || "");
  const [zone, setZone] = useState(() => sessionStorage.getItem("reg_zone") || "");
  const [earnings, setEarnings] = useState(() => sessionStorage.getItem("reg_earnings") || "");
  const [aadhaar, setAadhaar] = useState(() => sessionStorage.getItem("reg_aadhaar") || "");
  const [consent, setConsent] = useState(() => sessionStorage.getItem("reg_consent") === "true");
  const [kycVerified, setKycVerified] = useState(() => sessionStorage.getItem("reg_kycVerified") === "true");
  const [upi, setUpi] = useState(() => sessionStorage.getItem("reg_upi") || "");
  const [upiValid, setUpiValid] = useState<boolean | null>(null);

  // Persistence
  useEffect(() => { sessionStorage.setItem("reg_step", step.toString()); }, [step]);
  useEffect(() => { sessionStorage.setItem("reg_phone", phone); }, [phone]);
  useEffect(() => { sessionStorage.setItem("reg_otpSent", otpSent.toString()); }, [otpSent]);
  useEffect(() => { sessionStorage.setItem("reg_name", name); }, [name]);
  useEffect(() => { sessionStorage.setItem("reg_platform", platform); }, [platform]);
  useEffect(() => { sessionStorage.setItem("reg_city", city); }, [city]);
  useEffect(() => { sessionStorage.setItem("reg_zone", zone); }, [zone]);
  useEffect(() => { sessionStorage.setItem("reg_earnings", earnings); }, [earnings]);
  useEffect(() => { sessionStorage.setItem("reg_aadhaar", aadhaar); }, [aadhaar]);
  useEffect(() => { sessionStorage.setItem("reg_consent", consent.toString()); }, [consent]);
  useEffect(() => { sessionStorage.setItem("reg_kycVerified", kycVerified.toString()); }, [kycVerified]);
  useEffect(() => { sessionStorage.setItem("reg_upi", upi); }, [upi]);

  const progress = (step / 5) * 100;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (step === 1) {
        if (!otpSent) {
          if (phone.length === 10) handleSendOtp();
        } else {
          if (otp.length === 6) handleVerifyOtp();
        }
      } else if (step === 2) {
        if (name && platform && city && zone && earnings) setStep(3);
      } else if (step === 3) {
        if (aadhaar.length === 4 && consent) handleKycVerify();
      } else if (step === 4) {
        if (upiValid) navigate("/dashboard");
      }
    }
  };

  const handleSendOtp = () => {
    if (phone.length !== 10) { setError("Enter a valid 10-digit number"); return; }
    setError(""); setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (otp === "123456") { setError(""); setStep(2); }
    else { setError("Invalid OTP. Try 123456 for demo."); }
  };

  const handleKycVerify = () => {
    if (aadhaar.length === 4 && consent) { setKycVerified(true); setTimeout(() => setStep(4), 500); }
  };

  const handleUpiChange = (v: string) => {
    setUpi(v);
    setUpiValid(v.includes("@") && v.length > 3 ? true : v.length > 0 ? false : null);
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
        <Progress value={progress} className="h-1" />
      </div>

      <div className="container max-w-lg py-8" onKeyDown={handleKeyDown}>
        {/* Step 1: Phone */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Phone Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex gap-2">
                  <Input value="+91" disabled className="w-16" />
                  <Input placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} />
                </div>
              </div>
              {!otpSent ? (
                <Button className="w-full" onClick={handleSendOtp}>Send OTP</Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Enter OTP</Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleVerifyOtp}>Verify & Continue</Button>
                </div>
              )}
              <div className="relative my-2">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">or</span>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => toast.info("Google Sign-Up coming soon")}>
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign up with Google
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Profile */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Profile Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="Ramesh Kumar" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <ToggleGroup type="single" value={platform} onValueChange={setPlatform} className="grid grid-cols-2 gap-2">
                  {["Swiggy", "Zomato", "Amazon", "Zepto"].map((p) => (
                    <ToggleGroupItem key={p} value={p.toLowerCase()} className="border rounded-lg py-3 data-[state=on]:bg-primary/10 data-[state=on]:border-primary">{p}</ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={city} onValueChange={(v) => { setCity(v); setZone(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mumbai">Mumbai</SelectItem>
                    <SelectItem value="delhi">Delhi</SelectItem>
                    <SelectItem value="bangalore">Bangalore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {city && (
                <div className="space-y-2">
                  <Label>Zone</Label>
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                    <SelectContent>
                      {zones[city]?.map((z) => (
                        <SelectItem key={z.name} value={z.name.toLowerCase()}>
                          <span className="flex items-center gap-2">{z.name} <Badge variant="outline" className="text-xs">{z.risk}</Badge></span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Avg Weekly Earnings (₹)</Label>
                  <HoverCard>
                    <HoverCardTrigger><HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" /></HoverCardTrigger>
                    <HoverCardContent className="text-sm">Your average weekly earnings help us calculate the right premium and coverage amount for your protection plan.</HoverCardContent>
                  </HoverCard>
                </div>
                <Input type="number" placeholder="5000" value={earnings} onChange={(e) => setEarnings(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)} disabled={!name || !platform || !city || !zone || !earnings}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: KYC */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">KYC Verification <Badge variant="outline">{kycVerified ? "Verified" : "Pending"}</Badge></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert><AlertDescription>Your Aadhaar is hashed and never stored raw. We only verify the last 4 digits.</AlertDescription></Alert>
              <div className="space-y-2">
                <Label>Aadhaar Last 4 Digits</Label>
                <Input maxLength={4} placeholder="1234" value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="consent" checked={consent} onCheckedChange={(c) => setConsent(c as boolean)} />
                <Label htmlFor="consent" className="text-sm">I consent to Aadhaar verification per <a href="#" className="text-primary underline">terms</a></Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleKycVerify} disabled={aadhaar.length !== 4 || !consent}>Verify & Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: UPI */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">UPI Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <div className="relative">
                  <Input placeholder="name@upi" value={upi} onChange={(e) => handleUpiChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && upiValid && navigate("/dashboard")} />
                  {upiValid !== null && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2" variant={upiValid ? "outline" : "destructive"}>
                      {upiValid ? "Valid UPI ✓" : "Invalid"}
                    </Badge>
                  )}
                </div>
              </div>
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-display">Premium Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Base Premium</span><span>₹29/week</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Zone Risk Adj.</span><span>+₹6</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>Total Weekly</span><span className="text-primary">₹35/week</span></div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button size="lg" className="flex-1" onClick={() => navigate("/dashboard")} disabled={!upiValid}>Confirm & Activate Policy</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Register;
