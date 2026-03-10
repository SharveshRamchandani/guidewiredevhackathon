/**
 * Registration Step 1 — Phone + OTP
 * Route: /register/phone
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { workerApi, ApiError } from "@/lib/api";

const RegisterPhone = () => {
    const navigate = useNavigate();

    const [phone, setPhone] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [devOtp, setDevOtp] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    // Auto-fill OTP in dev mode
    useEffect(() => {
        if (otpSent && devOtp && devOtp.length === 6) {
            setOtp(devOtp);
        }
    }, [otpSent, devOtp]);

    const handleSendOtp = async () => {
        if (!/^\d{10}$/.test(phone)) {
            setError("Enter a valid 10-digit phone number");
            return;
        }
        setError("");
        setLoading(true);

        try {
            const result = await workerApi.sendOtp(phone);
            setOtpSent(true);
            setCooldown(60);

            if (result.otp) {
                setDevOtp(result.otp);
                toast.info(`[DEV] OTP: ${result.otp}`, { duration: 10000 });
            } else {
                toast.success("OTP sent to your phone");
            }
        } catch (err) {
            if (err instanceof ApiError && err.code === 'OTP_COOLDOWN_ACTIVE') {
                setCooldown(err.retryAfter || 60);
                setError(`Wait ${err.retryAfter}s before requesting a new OTP.`);
            } else {
                setError(err instanceof ApiError ? err.message : "Failed to send OTP.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
        setError("");
        setLoading(true);

        try {
            const result = await workerApi.verifyOtp(phone, otp);

            if (!result.isNewUser) {
                // Already registered — go to login flow
                toast.success("Welcome back! Redirecting to dashboard...");
                // Store token and redirect
                sessionStorage.setItem('_workerToken', result.token!);
                navigate("/dashboard");
                return;
            }

            // New user — store registration token in sessionStorage and proceed
            sessionStorage.setItem('_regToken', result.registrationToken!);
            sessionStorage.setItem('_regPhone', phone);
            navigate("/register/profile");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Verification failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-card border-b">
                <div className="container flex h-14 items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="font-bold font-display">GigShield</span>
                    </Link>
                    <ThemeToggle />
                </div>
                <Progress value={25} className="h-1" />
            </div>

            <div className="container max-w-lg py-8">
                <Card>
                    <CardHeader>
                        <Badge variant="outline" className="w-fit mb-2">Step 1 of 4</Badge>
                        <CardTitle className="font-display">Phone Verification</CardTitle>
                        <CardDescription>
                            We'll send a one-time code to verify your phone number
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="reg-phone">Phone Number</Label>
                            <div className="flex">
                                <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm font-medium">
                                    +91
                                </span>
                                <Input
                                    id="reg-phone"
                                    placeholder="9876543210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                                    maxLength={10}
                                    inputMode="numeric"
                                    disabled={otpSent}
                                    className="rounded-l-none"
                                />
                            </div>
                        </div>

                        {!otpSent ? (
                            <Button
                                id="reg-send-otp-btn"
                                className="w-full"
                                onClick={handleSendOtp}
                                disabled={loading || phone.length !== 10}
                            >
                                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Send OTP
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Enter OTP</Label>
                                        {cooldown > 0 ? (
                                            <Badge variant="secondary" className="text-xs">
                                                Resend in {cooldown}s
                                            </Badge>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs h-auto p-0"
                                                onClick={handleSendOtp}
                                                disabled={loading}
                                            >
                                                Resend OTP
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        <InputOTP
                                            maxLength={6}
                                            value={otp}
                                            onChange={setOtp}
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                        >
                                            <InputOTPGroup>
                                                {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                    {devOtp && (
                                        <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                                            [Dev Mode] OTP pre-filled: {devOtp}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    id="reg-verify-otp-btn"
                                    className="w-full"
                                    onClick={handleVerifyOtp}
                                    disabled={loading || otp.length !== 6}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Verify &amp; Continue
                                </Button>
                            </div>
                        )}

                        <p className="text-center text-sm text-muted-foreground">
                            Already registered?{" "}
                            <Link to="/login" className="text-primary hover:underline">
                                Login
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RegisterPhone;
