import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [totp, setTotp] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!email || !password) { setError("All fields are required"); return; }
    setError(""); setShow2FA(true);
  };

  const handleVerify = () => {
    if (totp === "123456") navigate("/admin/dashboard");
    else setError("Invalid code. Try 123456 for demo.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2"><Shield className="h-10 w-10 text-primary" /></div>
          <CardTitle className="font-display text-2xl">Admin Login</CardTitle>
          <CardDescription>GigShield Administration Panel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {!show2FA ? (
            <>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="admin@gigshield.in" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button className="w-full" onClick={handleLogin}>Login</Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Enter 2FA Code</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={totp} onChange={setTotp}>
                    <InputOTPGroup>{[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button className="w-full" onClick={handleVerify}>Verify</Button>
            </>
          )}
          <div className="relative my-2">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">or</span>
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={() => toast.info("Google Sign-In coming soon")}>
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
