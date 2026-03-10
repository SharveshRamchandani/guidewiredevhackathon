import { useState, useCallback } from "react";

export type AdminRole = "admin" | "super_admin";

interface AdminAuth {
  role: AdminRole;
  name: string;
  email: string;
}

// In a real app this would decode JWT / call an API.
// For now we use localStorage so the role persists across reloads.
const STORAGE_KEY = "gigshield_admin_role";

function getStoredRole(): AdminRole {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "admin" || stored === "super_admin") return stored;
  return "super_admin"; // default for demo
}

export function useAdminAuth(): AdminAuth & { setRole: (r: AdminRole) => void } {
  const [role, setRoleState] = useState<AdminRole>(getStoredRole);

  const setRole = useCallback((r: AdminRole) => {
    localStorage.setItem(STORAGE_KEY, r);
    setRoleState(r);
  }, []);

  return {
    role,
    name: role === "super_admin" ? "Super Admin" : "Admin User",
    email: role === "super_admin" ? "super@gigshield.in" : "admin@gigshield.in",
    setRole,
  };
}

export function isSuperAdmin(role: AdminRole): boolean {
  return role === "super_admin";
}
