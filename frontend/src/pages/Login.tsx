import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
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
import { useWorkerAuthStore } from "@/stores/workerAuthStore";

const Login = () => {
  const navigate = useNavigate();
  const { setToken, setWorker, setDevOtp, devOtp, isAuthenticated } = useWorkerAuthStore();

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Redirect if already auth'd
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

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
        // Dev mode: store OTP for auto-fill
        setDevOtp(result.otp);
        toast.info(`[DEV] OTP: ${result.otp}`, { duration: 10000 });
      } else {
        toast.success("OTP sent to your phone");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'OTP_COOLDOWN_ACTIVE') {
          setCooldown(err.retryAfter || 60);
          setError(`Wait ${err.retryAfter}s before requesting a new OTP.`);
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to send OTP. Please try again.");
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

      if (result.isNewUser) {
        // Redirect to registration with token in session context
        sessionStorage.setItem('_regToken', result.registrationToken!);
        navigate("/register/profile");
      } else {
        setToken(result.token!);
        setWorker(result.worker!);
        navigate("/dashboard");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
          <CardDescription>Login to your GigShield account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex">
              <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm font-medium">
                +91
              </span>
              <Input
                id="phone"
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
              id="send-otp-btn"
              className="w-full"
              onClick={handleSendOtp}
              disabled={loading}
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
                    [Dev Mode] OTP auto-filled: {devOtp}
                  </p>
                )}
              </div>
              <Button
                id="verify-otp-btn"
                className="w-full"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Verify &amp; Login
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register/phone" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
