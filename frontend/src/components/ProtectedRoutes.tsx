/**
 * Route guard components for admin and worker routes.
 *
 * RequireAdminAuth  — redirects to /admin/login if not authenticated
 * RequireWorkerAuth — redirects to /login if not authenticated
 * RequireSuperAdmin — redirects to /admin/dashboard if not super_admin (with toast)
 * RedirectIfAdminAuthed — redirects already-logged-in admins away from /admin/login
 * RedirectIfWorkerAuthed — redirects already-logged-in workers away from /login
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// ─── Admin route guards ────────────────────────────────────────────────────────

export function RequireAdminAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAdminAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        // Preserve the intended destination so we can redirect back after login
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

export function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isSuperAdmin } = useAdminAuthStore();
    const { toast } = useToast();
    const location = useLocation();

    useEffect(() => {
        if (isAuthenticated && !isSuperAdmin()) {
            toast({
                title: "Access Denied",
                description: "This page is only accessible to Super Admins.",
                variant: "destructive",
            });
        }
    }, [isAuthenticated, isSuperAdmin, toast]);

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    if (!isSuperAdmin()) {
        return <Navigate to="/not-authorized" replace />;
    }

    return <>{children}</>;
}

/** Redirect already-authenticated admins away from the login page */
export function RedirectIfAdminAuthed({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAdminAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
}

// ─── Worker route guards ───────────────────────────────────────────────────────

export function RequireWorkerAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useWorkerAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

/** Redirect already-authenticated workers away from the login/register pages */
export function RedirectIfWorkerAuthed({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useWorkerAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
