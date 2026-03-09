/**
 * Admin Setup Page
 * Route: /admin/setup?token=...
 * Called by new admins via their setup link email.
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Shield, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { adminApi, ApiError } from "@/lib/api";

function calculatePasswordStrength(password: string): number {
    let score = 0;
    if (password.length >= 12) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
}

const strengthLabel = (score: number) => {
    if (score <= 25) return { label: "Weak", color: "bg-red-500" };
    if (score <= 50) return { label: "Fair", color: "bg-orange-500" };
    if (score <= 75) return { label: "Good", color: "bg-yellow-500" };
    return { label: "Strong", color: "bg-green-500" };
};

const AdminSetup = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const strength = calculatePasswordStrength(password);
    const { label: strengthText, color: strengthColor } = strengthLabel(strength);

    // If no token — show error immediately
    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <Shield className="h-10 w-10 text-destructive mx-auto mb-2" />
                        <CardTitle>Invalid Setup Link</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertDescription>
                                This setup link is invalid or has expired. Please contact your GigShield administrator to resend the setup email.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setError("");
        setLoading(true);

        try {
            await adminApi.setup(token, password, confirmPassword);
            setSuccess(true);
            setTimeout(() => navigate("/admin/login"), 2000);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError("Setup failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-8 pb-8 text-center space-y-4">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                        <p className="text-xl font-semibold font-display">Account Setup Complete!</p>
                        <p className="text-muted-foreground text-sm">
                            Redirecting you to the login page...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="absolute top-4 right-4"><ThemeToggle /></div>
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                        <Shield className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">Complete Account Setup</CardTitle>
                    <CardDescription>
                        Create a strong password to secure your GigShield admin account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSetup} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="setup-password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="setup-password"
                                    type={showPass ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a strong password"
                                    autoComplete="new-password"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    onClick={() => setShowPass(s => !s)}
                                    tabIndex={-1}
                                >
                                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {/* Password strength meter */}
                            {password && (
                                <div className="space-y-1">
                                    <Progress value={strength} className={`h-1.5`} />
                                    <p className="text-xs text-muted-foreground">
                                        Strength: <span className={`font-medium ${strength > 75 ? 'text-green-600' : strength > 50 ? 'text-yellow-600' : strength > 25 ? 'text-orange-600' : 'text-red-600'}`}>
                                            {strengthText}
                                        </span>
                                    </p>
                                    <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                                        <li className={password.length >= 12 ? 'text-green-600' : ''}>
                                            {password.length >= 12 ? '✓' : '○'} At least 12 characters
                                        </li>
                                        <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                                            {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                                        </li>
                                        <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                                            {/[0-9]/.test(password) ? '✓' : '○'} One number
                                        </li>
                                        <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>
                                            {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} One special character
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="setup-confirm">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="setup-confirm"
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    onClick={() => setShowConfirm(s => !s)}
                                    tabIndex={-1}
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-destructive">Passwords do not match</p>
                            )}
                        </div>

                        <Button
                            id="setup-submit-btn"
                            type="submit"
                            className="w-full"
                            disabled={loading || strength < 100}
                        >
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Complete Setup
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSetup;
