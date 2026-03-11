import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, FileText, AlertTriangle, Wallet, User, Menu, X, Bell, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { MobileNavDock } from "@/components/MobileNavDock";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Policy", path: "/policy", icon: FileText },
  { label: "Claims", path: "/claims", icon: AlertTriangle },
  { label: "Payouts", path: "/payouts", icon: Wallet },
  { label: "Profile", path: "/profile", icon: User },
];

export function WorkerLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { worker, logout } = useWorkerAuthStore();
  const initials = worker?.name
    ? worker.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="flex h-14 items-center px-4 gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold font-display">GigShield</span>
          </Link>
          <div className="flex-1" />
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(true)}>
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">3</Badge>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">Logout</DropdownMenuItem>
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
              {i === 0 && <Separator className="my-2" />}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 pb-24 md:pb-6 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Nav Dock */}
      <MobileNavDock items={navItems} />

      <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </div>
  );
}
