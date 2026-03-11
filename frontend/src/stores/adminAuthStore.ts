/**
 * Admin Auth Store (Zustand)
 * Handles admin and super_admin auth state.
 * Token is memory-only — not localStorage or sessionStorage.
 * On refresh: token lost → redirect to /admin/login.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { adminApi, ApiError } from '@/lib/api';

interface AdminProfile {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'super_admin';
    jobTitle?: string;
}

interface AdminAuthStore {
    token: string | null;
    admin: AdminProfile | null;
    role: 'admin' | 'super_admin' | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    /** Call the login API and set auth state on success. */
    login: (email: string, password: string) => Promise<void>;
    setAuth: (token: string, admin: AdminProfile) => void;
    logout: () => void;
    isSuperAdmin: () => boolean;
}

export const useAdminAuthStore = create<AdminAuthStore>()(
    persist(
        (set, get) => ({
            token: null,
            admin: null,
            role: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (email, password) => {
                set({ isLoading: true });
                try {
                    const result = await adminApi.login(email, password);
                    set({
                        token: result.token,
                        admin: result.admin,
                        role: result.admin.role,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (err) {
                    set({ isLoading: false });
                    throw err; // Re-throw so callers (e.g. AdminLogin) can handle UI errors
                }
            },

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
        }),
        {
            name: 'admin-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
