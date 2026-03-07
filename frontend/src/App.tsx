import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Policy from "./pages/Policy";
import Claims from "./pages/Claims";
import Payouts from "./pages/Payouts";
import Profile from "./pages/Profile";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminWorkers from "./pages/admin/AdminWorkers";
import AdminPolicies from "./pages/admin/AdminPolicies";
import AdminClaims from "./pages/admin/AdminClaims";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminCron from "./pages/admin/AdminCron";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminFraud from "./pages/admin/AdminFraud";
import AdminProfile from "./pages/admin/AdminProfile";
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
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/payouts" element={<Payouts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/workers" element={<AdminWorkers />} />
            <Route path="/admin/policies" element={<AdminPolicies />} />
            <Route path="/admin/claims" element={<AdminClaims />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/cron" element={<AdminCron />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/fraud" element={<AdminFraud />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
