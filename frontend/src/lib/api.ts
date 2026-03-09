/**
 * API Client — GigShield
 * Centralized fetch wrapper with error normalization.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ApiErrorShape {
    error: {
        code: string;
        message: string;
        retryAfter?: number;
    };
}

export class ApiError extends Error {
    constructor(
        public code: string,
        message: string,
        public status: number,
        public retryAfter?: number
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
    token?: string | null
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const err = data as ApiErrorShape;
        throw new ApiError(
            err?.error?.code || 'UNKNOWN_ERROR',
            err?.error?.message || `HTTP ${res.status}`,
            res.status,
            err?.error?.retryAfter
        );
    }

    return data as T;
}

// ─── Worker Auth ──────────────────────────────────────────────────────────────

export const workerApi = {
    sendOtp: (phone: string) =>
        apiFetch<{ success: boolean; otp?: string; expiresIn: number }>(
            '/api/auth/send-otp',
            { method: 'POST', body: JSON.stringify({ phone }) }
        ),

    verifyOtp: (phone: string, otp: string) =>
        apiFetch<{
            isNewUser: boolean;
            token?: string;
            worker?: { id: string; name: string; phone: string };
            registrationToken?: string;
        }>(
            '/api/auth/verify-otp',
            { method: 'POST', body: JSON.stringify({ phone, otp }) }
        ),

    validateCode: (code: string) =>
        apiFetch<{ valid: boolean; companyName?: string }>(
            '/api/auth/validate-code',
            { method: 'POST', body: JSON.stringify({ code }) }
        ),

    completeRegistration: (registrationToken: string, data: {
        name: string;
        platform: string;
        city: string;
        zoneId?: number;
        avgWeeklyEarning?: number;
        aadhaarLast4: string;
        upiId: string;
        registrationCode: string;
    }) =>
        apiFetch<{ token: string; worker: { id: string; name: string; phone: string; adminId: string } }>(
            '/api/auth/register/complete',
            {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { Authorization: `Bearer ${registrationToken}` },
            }
        ),
};

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export const adminApi = {
    login: (email: string, password: string) =>
        apiFetch<{
            token: string;
            admin: { id: string; name: string; email: string; role: 'admin' | 'super_admin'; companyName?: string };
        }>(
            '/api/admin/auth/login',
            { method: 'POST', body: JSON.stringify({ email, password }) }
        ),

    setup: (token: string, password: string, confirmPassword: string) =>
        apiFetch<{ success: boolean }>(
            '/api/admin/auth/setup',
            { method: 'POST', body: JSON.stringify({ token, password, confirmPassword }) }
        ),
};

// ─── Super Admin ──────────────────────────────────────────────────────────────

export const superAdminApi = {
    createAdmin: (data: {
        name: string;
        email: string;
        companyName: string;
        companyRegNumber?: string;
    }, token: string) =>
        apiFetch<{
            success: boolean;
            setupLink?: string;
            registrationCode?: string;
            admin?: { id: string; name: string; email: string; companyName: string };
        }>(
            '/api/super-admin/admins/create',
            { method: 'POST', body: JSON.stringify(data) },
            token
        ),

    listAdmins: (token: string) =>
        apiFetch<{
            admins: Array<{
                id: string; name: string; email: string; company_name: string;
                registration_code: string; active: boolean; worker_count: number;
                active_policy_count: number; claims_this_month: number;
            }>
        }>(
            '/api/super-admin/admins',
            {},
            token
        ),

    deactivateAdmin: (id: string, token: string) =>
        apiFetch<{ success: boolean }>(
            `/api/super-admin/admins/${id}/deactivate`,
            { method: 'PATCH' },
            token
        ),

    getPlatformStats: (token: string) =>
        apiFetch<{
            stats: {
                totalAdmins: number;
                totalWorkers: number;
                totalActivePolicies: number;
                totalPayoutsThisWeek: number;
            }
        }>(
            '/api/super-admin/dashboard/stats',
            {},
            token
        ),
};
