/**
 * Worker Auth Store (Zustand)
 * Token stored in Zustand memory only — not localStorage or sessionStorage.
 * On refresh: token lost → redirect to /login.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WorkerProfile {
    id: string;
    name: string;
    phone: string;
}

/** The plan selected & paid for during registration — kept in context */
export interface SelectedPlan {
    id: string;
    name: string;
    base_premium: number;
    max_payout: number;
    coverage_days: number;
    transaction_id: string;
}

interface WorkerAuthStore {
    token: string | null;
    worker: WorkerProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    devOtp: string | null;  // stores OTP in dev mode for auto-fill
    /** Plan chosen and paid for during registration */
    selectedPlan: SelectedPlan | null;

    setToken: (token: string) => void;
    setWorker: (worker: WorkerProfile) => void;
    setDevOtp: (otp: string | null) => void;
    setSelectedPlan: (plan: SelectedPlan | null) => void;
    logout: () => void;
}

export const useWorkerAuthStore = create<WorkerAuthStore>()(
    persist(
        (set) => ({
            token: null,
            worker: null,
            isAuthenticated: false,
            isLoading: false,
            devOtp: null,
            selectedPlan: null,

            setToken: (token) =>
                set({ token, isAuthenticated: true, isLoading: false }),

            setWorker: (worker) =>
                set({ worker }),

            setDevOtp: (otp) =>
                set({ devOtp: otp }),

            setSelectedPlan: (plan) =>
                set({ selectedPlan: plan }),

            logout: () => {
                set({ token: null, worker: null, isAuthenticated: false, devOtp: null, selectedPlan: null });
                window.location.href = '/';
            },
        }),
        {
            name: 'worker-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
