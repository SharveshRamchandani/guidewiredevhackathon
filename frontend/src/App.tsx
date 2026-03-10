import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Worker pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";  // legacy — kept for compatibility
import RegisterPhone from "./pages/RegisterPhone";
import RegisterProfile from "./pages/RegisterProfile";
import RegisterKyc from "./pages/RegisterKyc";
import RegisterUpi from "./pages/RegisterUpi";
import Dashboard from "./pages/Dashboard";
import Policy from "./pages/Policy";
import Claims from "./pages/Claims";
import Payouts from "./pages/Payouts";
import Profile from "./pages/Profile";

// Admin pages — shared (admin + super_admin)
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSetup from "./pages/admin/AdminSetup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOAuthCallback from "./pages/admin/AdminOAuthCallback";
import AdminWorkers from "./pages/admin/AdminWorkers";
import AdminPolicies from "./pages/admin/AdminPolicies";
import AdminClaims from "./pages/admin/AdminClaims";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminCron from "./pages/admin/AdminCron";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminFraud from "./pages/admin/AdminFraud";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminPlatformStats from "./pages/admin/AdminPlatformStats";
import AdminGlobalSettings from "./pages/admin/AdminGlobalSettings";

// Super Admin-only pages
import AdminStaff from "./pages/admin/AdminStaff";
import AdminCreateStaff from "./pages/admin/AdminCreateStaff";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ─── Worker Routes ─── */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Legacy register (kept for backward compat) */}
            <Route path="/register" element={<Register />} />

            {/* Multi-step registration wizard — no registration code */}
            <Route path="/register/phone" element={<RegisterPhone />} />
            <Route path="/register/profile" element={<RegisterProfile />} />
            <Route path="/register/kyc" element={<RegisterKyc />} />
            <Route path="/register/upi" element={<RegisterUpi />} />

            {/* Worker protected routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/payouts" element={<Payouts />} />
            <Route path="/profile" element={<Profile />} />

            {/* ─── Admin Routes ─── */}
            {/* /admin redirects to dashboard (or login if not authenticated) */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/oauth/callback" element={<AdminOAuthCallback />} />
            <Route path="/admin/setup" element={<AdminSetup />} />

            {/* Admin + Super Admin protected routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/workers" element={<AdminWorkers />} />
            <Route path="/admin/policies" element={<AdminPolicies />} />
            <Route path="/admin/claims" element={<AdminClaims />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/cron" element={<AdminCron />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/fraud" element={<AdminFraud />} />
            <Route path="/admin/profile" element={<AdminProfile />} />

            {/* Super Admin-only routes */}
            <Route path="/admin/staff" element={<AdminStaff />} />
            <Route path="/admin/staff/new" element={<AdminCreateStaff />} />
            <Route path="/admin/platform" element={<AdminPlatformStats />} />
            <Route path="/admin/platform/settings" element={<AdminGlobalSettings />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
