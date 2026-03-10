// Central API service for GigShield backend (http://localhost:5000)

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('gs_token');
}

export function setToken(token: string) {
  localStorage.setItem('gs_token', token);
}

export function clearAuth() {
  localStorage.removeItem('gs_token');
  localStorage.removeItem('gs_user');
}

export function getUser() {
  const raw = localStorage.getItem('gs_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: unknown) {
  localStorage.setItem('gs_user', JSON.stringify(user));
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface LoginResponse {
  success: boolean;
  data: { worker: WorkerProfile; token: string };
}

export interface RegisterResponse {
  success: boolean;
  data: { worker: WorkerProfile; token: string };
}

export interface WorkerProfile {
  id: string;
  name: string;
  phone: string;
  platform: string;
  zone_id: string | null;
  city_id: string | null;
  upi: string | null;
  kyc_status: string;
  risk_level: string;
  zone_name?: string;
  city_name?: string;
}

export const auth = {
  async login(phone: string, password: string): Promise<LoginResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },

  async register(data: {
    name: string;
    phone: string;
    password: string;
    platform: string;
    zone_id?: string;
    city_id?: string;
    upi?: string;
  }): Promise<RegisterResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async me(): Promise<{ success: boolean; data: WorkerProfile }> {
    return request('/auth/me');
  },

  async logout(): Promise<void> {
    try { await request('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    clearAuth();
  },
};

// ─── Policy API ───────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  weekly_premium: number;
  max_coverage: number;
  coverage_config: Record<string, { payoutPercent: number; maxPayout: number }>;
}

export const policy = {
  async getPlans(): Promise<{ success: boolean; data: Plan[] }> {
    return request('/policy/plans');
  },

  async getQuote(plan_id: string) {
    return request('/policy/quote', { method: 'POST', body: JSON.stringify({ plan_id }) });
  },

  async create(plan_id: string, start_date?: string, auto_renew = true) {
    return request('/policy/create', {
      method: 'POST',
      body: JSON.stringify({ plan_id, start_date, auto_renew }),
    });
  },

  async getMyPolicies() {
    return request('/policy/my');
  },

  async getPolicy(id: string) {
    return request(`/policy/${id}`);
  },

  async renew(id: string) {
    return request(`/policy/${id}/renew`, { method: 'POST' });
  },
};

// ─── Claims API ───────────────────────────────────────────────────────────────

export const claims = {
  async getMyClaims() {
    return request('/claims/my');
  },

  async initiate(data: { policy_id: string; type?: string; description?: string }) {
    return request('/claims/auto-initiate', { method: 'POST', body: JSON.stringify(data) });
  },

  async getStatus(id: string) {
    return request(`/claims/${id}/status`);
  },
};

// ─── Payouts API ──────────────────────────────────────────────────────────────

export const payouts = {
  async getMyPayouts() {
    return request('/payouts/my');
  },

  async initiate(claim_id: string) {
    return request('/payouts/initiate', { method: 'POST', body: JSON.stringify({ claim_id }) });
  },

  async getStatus(id: string) {
    return request(`/payouts/${id}/status`);
  },
};

// ─── Admin API ────────────────────────────────────────────────────────────────

export function getAdminToken(): string | null {
  return localStorage.getItem('gs_admin_token');
}
export function setAdminToken(token: string) {
  localStorage.setItem('gs_admin_token', token);
}
export function clearAdminAuth() {
  localStorage.removeItem('gs_admin_token');
  localStorage.removeItem('gs_admin_user');
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export const admin = {
  async login(email: string, password: string) {
    return adminRequest('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout() {
    try { await adminRequest('/admin/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    clearAdminAuth();
  },

  async getDashboard() { return adminRequest('/admin/dashboard'); },
  async getWorkers(params?: string) { return adminRequest(`/admin/workers${params ? '?' + params : ''}`); },
  async getClaims(params?: string) { return adminRequest(`/admin/claims${params ? '?' + params : ''}`); },
  async getPolicies(params?: string) { return adminRequest(`/admin/policies${params ? '?' + params : ''}`); },
  async getEvents() { return adminRequest('/admin/events'); },
  async getAnalytics() { return adminRequest('/admin/analytics'); },
  async getConfig() { return adminRequest('/admin/config'); },

  async approveClaim(id: string) {
    return adminRequest(`/admin/claims/${id}/approve`, { method: 'POST' });
  },
  async rejectClaim(id: string, reason: string) {
    return adminRequest(`/admin/claims/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  async updateKyc(id: string, kyc_status: string) {
    return adminRequest(`/admin/workers/${id}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify({ kyc_status }),
    });
  },
  async updateConfig(data: Record<string, unknown>) {
    return adminRequest('/admin/config', { method: 'PATCH', body: JSON.stringify(data) });
  },
};
