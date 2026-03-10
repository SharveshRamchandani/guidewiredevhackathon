/**
 * Admin Auth Store (Zustand)
 * Handles admin and super_admin auth state.
 * Token is memory-only — not localStorage.
 */
import { create } from 'zustand';

interface AdminProfile {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'super_admin';
    companyName?: string;
}

interface AdminAuthStore {
    token: string | null;
    admin: AdminProfile | null;
    role: 'admin' | 'super_admin' | null;
    isAuthenticated: boolean;

    setAuth: (token: string, admin: AdminProfile) => void;
    logout: () => void;
    isSuperAdmin: () => boolean;
}

export const useAdminAuthStore = create<AdminAuthStore>((set, get) => ({
    token: null,
    admin: null,
    role: null,
    isAuthenticated: false,

    setAuth: (token, admin) =>
        set({
            token,
            admin,
            role: admin.role,
            isAuthenticated: true,
        }),

    logout: () => {
        set({ token: null, admin: null, role: null, isAuthenticated: false });
        window.location.href = '/admin/login';
    },

    isSuperAdmin: () => get().role === 'super_admin',
}));
