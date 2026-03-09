/**
 * Admin OAuth Callback Page
 * Route: /admin/oauth/callback
 *
 * The backend redirects here after successful Google OAuth with:
 *   ?token=JWT&id=...&name=...&email=...&role=...&companyName=...
 *
 * This page reads the params, stores them in the Zustand store,
 * then navigates to the dashboard.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";

const AdminOAuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setAuth } = useAdminAuthStore();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get("token");
        const id = searchParams.get("id");
        const name = searchParams.get("name");
        const email = searchParams.get("email");
        const role = searchParams.get("role") as "admin" | "super_admin";
        const companyName = searchParams.get("companyName") ?? undefined;
        const errorParam = searchParams.get("error");

        if (errorParam) {
            setError(
                errorParam === "google_auth_failed"
                    ? "Google sign-in failed. Your Google account may not be linked to an admin account."
                    : "Authentication failed. Please try again."
            );
            return;
        }

        if (!token || !id || !email || !role) {
            setError("Invalid authentication response. Please try logging in again.");
            return;
        }

        // Hydrate Zustand store
        setAuth(token, { id, name: name ?? email, email, role, companyName });

        // Redirect to dashboard
        navigate("/admin/dashboard", { replace: true });
    }, [searchParams, setAuth, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold">Sign-in Failed</h2>
                    <p className="text-muted-foreground text-sm">{error}</p>
                    <button
                        onClick={() => navigate("/admin/login")}
                        className="mt-2 text-primary text-sm hover:underline"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Completing sign-in…</p>
            </div>
        </div>
    );
};

export default AdminOAuthCallback;
