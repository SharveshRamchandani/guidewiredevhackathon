import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, Users, FileText, AlertTriangle, Clock, BarChart3, ShieldAlert, Zap, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminMobileNavDock } from "@/components/AdminMobileNavDock";

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Workers", path: "/admin/workers", icon: Users },
  { label: "Policies", path: "/admin/policies", icon: FileText },
  { label: "Claims", path: "/admin/claims", icon: AlertTriangle },
  { label: "Events", path: "/admin/events", icon: Zap },
  { label: "Cron", path: "/admin/cron", icon: Clock },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Fraud", path: "/admin/fraud", icon: ShieldAlert },
  { label: "Profile", path: "/admin/profile", icon: User },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="flex h-14 items-center px-4 gap-4">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold font-display">GigShield</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Admin</span>
          </Link>
          <div className="flex-1" />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary text-primary-foreground">AD</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Settings</DropdownMenuItem>
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
