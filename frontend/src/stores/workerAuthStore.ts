/**
 * Worker Auth Store (Zustand)
 * Token stored in Zustand memory only — not localStorage.
 * On refresh, token is lost → redirect to /login.
 */
import { create } from 'zustand';

interface WorkerProfile {
    id: string;
    name: string;
    phone: string;
    adminId?: string;
}

interface WorkerAuthStore {
    token: string | null;
    worker: WorkerProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    devOtp: string | null;  // stores OTP in dev mode for auto-fill

    setToken: (token: string) => void;
    setWorker: (worker: WorkerProfile) => void;
    setDevOtp: (otp: string | null) => void;
    logout: () => void;
}

export const useWorkerAuthStore = create<WorkerAuthStore>((set) => ({
    token: null,
    worker: null,
    isAuthenticated: false,
    isLoading: false,
    devOtp: null,

    setToken: (token) =>
        set({ token, isAuthenticated: true, isLoading: false }),

    setWorker: (worker) =>
        set({ worker }),

    setDevOtp: (otp) =>
        set({ devOtp: otp }),

    logout: () => {
        set({ token: null, worker: null, isAuthenticated: false, devOtp: null });
        window.location.href = '/';
    },
}));
