/**
 * API Client — GigShield
 * Centralized fetch wrapper with error normalization.
 * COMPLETE VERSION WITH ALL EXPORTS
 */

const API_BASE = (import.meta.env as any).VITE_API_URL || 'http://localhost:5000';

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
        const code = err?.error?.code || 'UNKNOWN_ERROR';

        if (code === 'INACTIVE_ACCOUNT') {
            window.location.href = '/not-authorized';
        }

        throw new ApiError(
            code,
            err?.error?.message || `HTTP ${res.status}`,
            res.status,
            err?.error?.retryAfter
        );
    }

    return data as T;
}

// ─── Worker API ──────────────────────────────────────────────────────────────

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

    completeRegistration: (registrationToken: string, data: {
        name: string;
        platform: string;
        city: string;
        zoneId?: string;
        avgWeeklyEarning?: number;
        aadhaarLast4: string;
        upiId: string;
    }) =>
        apiFetch<{ token: string; worker: { id: string; name: string; phone: string } }>(
            '/api/auth/register/complete',
            {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { Authorization: `Bearer ${registrationToken}` },
            }
        ),

    updateLocation: (city: string, zoneId: string, token?: string | null) =>
        apiFetch<{ success: boolean; worker?: { id: string; city: string; zone_id: string } }>(
            '/api/worker/location',
            { 
                method: 'PATCH', 
                body: JSON.stringify({ city, zone_id: zoneId }) 
            },
            token
        ),
};

// ─── Admin API ───────────────────────────────────────────────────────────────

export const adminApi = {
    login: (email: string, password: string) =>
        apiFetch<{
            token: string;
            admin: { id: string; name: string; email: string; role: 'admin' | 'super_admin'; jobTitle?: string };
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

// ─── Super Admin API ─────────────────────────────────────────────────────────

export const superAdminApi = {
    createStaff: (data: {
        name: string;
        email: string;
        jobTitle?: string;
    }, token: string) =>
        apiFetch<{
            success: boolean;
            setupLink?: string;
            admin?: { id: string; name: string; email: string; jobTitle?: string };
        }>(
            '/api/super-admin/staff/create',
            { method: 'POST', body: JSON.stringify(data) },
            token
        ),

    listStaff: (token: string) =>
        apiFetch<{
            staff: Array<{
                id: string;
                name: string;
                email: string;
                job_title: string | null;
                role: 'admin' | 'super_admin';
                active: boolean;
                last_login: string | null;
                created_at: string;
            }>;
        }>(
            '/api/super-admin/staff',
            {},
            token
        ),

    deactivateStaff: (id: string, token: string) =>
        apiFetch<{ success: boolean }>(
            `/api/super-admin/staff/${id}/deactivate`,
            { method: 'PATCH' },
            token
        ),

    reactivateStaff: (id: string, token: string) =>
        apiFetch<{ success: boolean }>(
            `/api/super-admin/staff/${id}/reactivate`,
            { method: 'PATCH' },
            token
        ),

    getPlatformStats: (token: string) =>
        apiFetch<{
            stats: {
                totalWorkers: number;
                activeWorkersThisWeek: number;
                totalActivePolicies: number;
                totalPremiumsThisWeek: number;
                totalPayoutsThisWeek: number;
                platformLossRatio: number;
                totalAdminStaff: number;
                pendingFraudReviews: number;
            };
        }>(
            '/api/super-admin/dashboard/stats',
            {},
            token
        ),

    getAuditLog: (params: {
        page?: number;
        limit?: number;
        adminId?: string;
        action?: string;
        from?: string;
        to?: string;
    }, token: string) => {
        const qs = new URLSearchParams(
            Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => [k, String(v)])
        ).toString();
        return apiFetch<{
            logs: Array<{
                id: string;
                admin_name: string;
                admin_email: string;
                action: string;
                target_type: string;
                target_id: string;
                old_value: unknown;
                new_value: unknown;
                created_at: string;
            }>;
            total: number;
            page: number;
            limit: number;
        }>(
            `/api/super-admin/audit-log${qs ? `?${qs}` : ''}`,
            {},
            token
        );
    },
};

