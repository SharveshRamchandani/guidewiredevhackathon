import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Route guards
import {
  RequireAdminAuth,
  RequireSuperAdmin,
  RedirectIfAdminAuthed,
  RequireWorkerAuth,
  RedirectIfWorkerAuthed,
} from "@/components/ProtectedRoutes";

// Layouts
import { AdminLayout } from "@/components/AdminLayout";
import { WorkerLayout } from "@/components/WorkerLayout";

// Worker pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterPhone from "./pages/RegisterPhone";
import RegisterProfile from "./pages/RegisterProfile";
import RegisterKyc from "./pages/RegisterKyc";
import RegisterUpi from "./pages/RegisterUpi";
import Dashboard from "./pages/Dashboard";
import Policy from "./pages/Policy";
import Claims from "./pages/Claims";
import Payouts from "./pages/Payouts";
import Profile from "./pages/Profile";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSetup from "./pages/admin/AdminSetup";
import AdminOAuthCallback from "./pages/admin/AdminOAuthCallback";
import AdminDashboard from "./pages/admin/AdminDashboard";
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
import AdminStaff from "./pages/admin/AdminStaff";
import AdminCreateStaff from "./pages/admin/AdminCreateStaff";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminCompanyDetail from "./pages/admin/AdminCompanyDetail";

import NotFound from "./pages/NotFound";
import NotAuthorizedPage from "./pages/NotAuthorizedPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>

            {/* ─── Public Worker Routes ─── */}
            <Route path="/" element={<Landing />} />

            {/* Redirect already-logged-in workers away from login/register */}
            <Route path="/login" element={
              <RedirectIfWorkerAuthed><Login /></RedirectIfWorkerAuthed>
            } />
            <Route path="/register" element={
              <RedirectIfWorkerAuthed><Register /></RedirectIfWorkerAuthed>
            } />
            <Route path="/register/phone" element={
              <RedirectIfWorkerAuthed><RegisterPhone /></RedirectIfWorkerAuthed>
            } />

            {/* Registration steps — guarded by sessionStorage in each page */}
            <Route path="/register/profile" element={<RegisterProfile />} />
            <Route path="/register/kyc" element={<RegisterKyc />} />
            <Route path="/register/upi" element={<RegisterUpi />} />

            {/* ─── Protected Worker Routes (layout stays mounted) ─── */}
            <Route element={<RequireWorkerAuth><WorkerLayout /></RequireWorkerAuth>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/policy" element={<Policy />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* ─── Public Admin Routes ─── */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

            {/* Redirect already-logged-in admins away from login */}
            <Route path="/admin/login" element={
              <RedirectIfAdminAuthed><AdminLogin /></RedirectIfAdminAuthed>
            } />

            {/* OAuth callback & setup — public (no auth needed) */}
            <Route path="/admin/oauth/callback" element={<AdminOAuthCallback />} />
            <Route path="/admin/setup" element={<AdminSetup />} />

            {/* ─── Protected Admin Routes (layout stays mounted) ─── */}
            <Route element={<RequireAdminAuth><AdminLayout /></RequireAdminAuth>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/workers" element={<AdminWorkers />} />
              <Route path="/admin/policies" element={<AdminPolicies />} />
              <Route path="/admin/claims" element={<AdminClaims />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/admin/cron" element={<AdminCron />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/fraud" element={<AdminFraud />} />
              <Route path="/admin/profile" element={<AdminProfile />} />

              {/* ─── Super Admin-Only Routes ─── */}
              <Route path="/admin/staff" element={<RequireSuperAdmin><AdminStaff /></RequireSuperAdmin>} />
              <Route path="/admin/staff/new" element={<RequireSuperAdmin><AdminCreateStaff /></RequireSuperAdmin>} />
              <Route path="/admin/platform" element={<RequireSuperAdmin><AdminPlatformStats /></RequireSuperAdmin>} />
              <Route path="/admin/platform/settings" element={<RequireSuperAdmin><AdminGlobalSettings /></RequireSuperAdmin>} />
              <Route path="/admin/companies" element={<RequireSuperAdmin><AdminCompanies /></RequireSuperAdmin>} />
              <Route path="/admin/companies/:id" element={<RequireSuperAdmin><AdminCompanyDetail /></RequireSuperAdmin>} />
            </Route>

            <Route path="*" element={<NotFound />} />
            <Route path="/not-authorized" element={<NotAuthorizedPage />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
