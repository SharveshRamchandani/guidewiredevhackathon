import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { toast } from "sonner";

/**
 * Parses a JWT payload without verifying the signature (client-side only).
 * Signature verification happens on the backend for every protected request.
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export default function AdminOAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuth } = useAdminAuthStore();

    useEffect(() => {
        const token = searchParams.get("token");
        const error = searchParams.get("error");

        if (error) {
            toast.error("Google login failed. Please contact your super admin.");
            navigate("/admin/login", { replace: true });
            return;
        }

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        // Decode admin info directly from JWT payload — avoids truncated URL issues
        const payload = parseJwtPayload(token);
        if (!payload || !payload.id) {
            toast.error("Invalid token received from Google login.");
            navigate("/admin/login", { replace: true });
            return;
        }

        const admin = {
            id: payload.id as string,
            name: (payload.name as string) || "",
            email: payload.email as string,
            role: payload.role as "admin" | "super_admin",
            jobTitle: (payload.jobTitle as string) || undefined,
        };

        setAuth(token, admin);
        toast.success(`Welcome back, ${admin.name || admin.email}!`);
        navigate("/admin/dashboard", { replace: true });

    }, [searchParams, navigate, setAuth]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground animate-pulse">Completing login...</p>
            </div>
        </div>
    );
}
