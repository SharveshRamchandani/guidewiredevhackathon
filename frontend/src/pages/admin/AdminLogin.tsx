/**
 * Admin Login Page
 * Route: /admin/login
 * Used by both Admin and Super Admin (role resolved from JWT after login).
 * Email + password only — no Google OAuth.
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { adminApi, ApiError } from "@/lib/api";
import { useAdminAuthStore } from "@/stores/adminAuthStore";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated } = useAdminAuthStore();

  // Where to go after login — default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ type: string; message: string } | null>(null);

  // Already authenticated → redirect to intended destination
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      setError({ type: "general", message: "Email and password are required." });
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const result = await adminApi.login(email, password);
      setAuth(result.token, result.admin);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "SETUP_NOT_COMPLETED") {
          setError({
            type: "setup",
            message: "Your account setup is not complete. Check your email for the setup link.",
          });
        } else if (err.code === "GOOGLE_ONLY_ACCOUNT") {
          setError({
            type: "google",
            message: "This account uses Google Sign-In. Please use the \"Sign in with Google\" button below.",
          });
        } else if (err.code === "RATE_LIMIT_EXCEEDED") {
          setError({
            type: "general",
            message: "Too many login attempts. Please try again later.",
          });
        } else if (err.code === "INACTIVE_ACCOUNT") {
          navigate("/not-authorized", { replace: true });
        } else {
          setError({ type: "general", message: "Invalid email or password." });
        }
      } else {
        setError({ type: "general", message: "Login failed. Please try again." });
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
          <CardTitle className="font-display text-2xl">GigShield Staff Portal</CardTitle>
          <CardDescription>
            For GigShield operations team only. Workers please use the{" "}
            <a href="/" className="text-primary hover:underline">main app</a>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {(error?.type === "setup" || error?.type === "google") && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
            {error?.type === "general" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="staff@gigshield.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              id="admin-login-btn"
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Login
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/auth/google`;
              }}
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </Button>

            {/* TODO: Add forgot password when FEATURE_EMAIL_ENABLED=true */}
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            This portal is for GigShield operations staff only.
            <br />
            If you are a delivery partner,{" "}
            <a href="/" className="text-primary hover:underline">
              visit the worker portal
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
