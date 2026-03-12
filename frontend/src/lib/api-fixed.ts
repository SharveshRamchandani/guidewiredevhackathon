/**
 * API Client — GigShield
 * Centralized fetch wrapper with error normalization.
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

        // Global intercept: If account becomes inactive mid-session
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

    // No registrationCode — workers register directly with GigShield
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

// Rest of file unchanged...

