import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, Users, FileText, AlertTriangle, Clock, BarChart3, ShieldAlert, Zap, User, Building2, PlusCircle, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminMobileNavDock } from "@/components/AdminMobileNavDock";
import { useAdminAuth, isSuperAdmin } from "@/hooks/useAdminAuth";

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Workers", path: "/admin/workers", icon: Users },
  { label: "Policies", path: "/admin/policies", icon: FileText },
  { label: "Claims", path: "/admin/claims", icon: AlertTriangle },
  { label: "Events", path: "/admin/events", icon: Zap },
  { label: "Cron Config", path: "/admin/cron", icon: Clock },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Fraud Queue", path: "/admin/fraud", icon: ShieldAlert },
  { label: "Profile", path: "/admin/profile", icon: User },
];

const superAdminItems = [
  { label: "All Companies", path: "/admin/companies", icon: Building2 },
  { label: "Create Company", path: "/admin/companies/new", icon: PlusCircle },
  { label: "Platform Stats", path: "/admin/platform", icon: Activity },
  { label: "Global Settings", path: "/admin/platform/settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { role, name } = useAdminAuth();
  const showSuperAdmin = isSuperAdmin(role);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="flex h-14 items-center px-4 gap-4">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold font-display">GigShield</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
              {showSuperAdmin ? "Super Admin" : "Admin"}
            </span>
          </Link>
          <div className="flex-1" />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{showSuperAdmin ? "SA" : "AD"}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">{name}</DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/admin/profile">Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/admin/login">Logout</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden md:block w-60 border-r bg-card h-[calc(100vh-3.5rem)] p-3 space-y-1 sticky top-14 z-40 overflow-y-auto shrink-0">
          {navItems.map((item, i) => (
            <div key={item.path}>
              <Link to={item.path}>
                <Button variant={location.pathname === item.path ? "secondary" : "ghost"} className="w-full justify-start gap-2" size="sm">
                  <item.icon className="h-4 w-4" /> {item.label}
                </Button>
              </Link>
              {(i === 0 || i === 4) && <Separator className="my-2" />}
            </div>
          ))}

          {showSuperAdmin && (
            <>
              <Separator className="my-3" />
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform Management</p>
              {superAdminItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={location.pathname === item.path ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2 border-l-2 border-transparent data-[active=true]:border-l-primary"
                    size="sm"
                    data-active={location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Button>
                </Link>
              ))}
            </>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 pb-24 md:pb-6 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Nav Dock */}
      <AdminMobileNavDock />
    </div>
  );
}
