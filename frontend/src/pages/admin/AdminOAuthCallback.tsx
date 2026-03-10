import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { toast } from "sonner";

export default function AdminOAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuth } = useAdminAuthStore();

    useEffect(() => {
        const token = searchParams.get("token");
        const adminData = searchParams.get("admin");
        const error = searchParams.get("error");

        if (error) {
            toast.error("Google login failed. Please contact your super admin.");
            navigate("/admin/login", { replace: true });
            return;
        }

        if (token && adminData) {
            try {
                const admin = JSON.parse(adminData);
                setAuth(token, admin);
                navigate("/admin/dashboard", { replace: true });
            } catch (err) {
                toast.error("Failed to parse login credentials");
                navigate("/admin/login", { replace: true });
            }
        } else {
            navigate("/admin/login", { replace: true });
        }
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
