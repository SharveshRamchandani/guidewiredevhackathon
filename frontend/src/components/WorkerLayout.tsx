import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, FileText, AlertTriangle, Wallet, User, Menu, X, Bell, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("gigshield:sidebar-collapsed") === "true";
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem("gigshield:sidebar-collapsed", String(newState));
      return newState;
    });
  };
  const { worker, logout } = useWorkerAuthStore();
  const initials = worker?.name
    ? worker.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile, now full height */}
      <aside className={`hidden md:flex flex-col border-r bg-card h-screen p-3 space-y-1 sticky top-0 z-40 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-60'}`}>
        <div className="flex items-center gap-2 mb-6 px-2 pt-2 justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <Shield className="h-6 w-6 text-primary shrink-0" />
            {!isCollapsed && <span className="font-bold font-display text-lg whitespace-nowrap">GigShield</span>}
          </Link>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={toggleSidebarCollapse}>
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-1 overflow-x-hidden">
          {navItems.map((item, i) => (
            <div key={item.path}>
              <Link to={item.path}>
                <Button variant={location.pathname === item.path ? "secondary" : "ghost"} className={`w-full gap-2 ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`} size="sm" title={item.label}>
                  <item.icon className="h-4 w-4 shrink-0" /> 
                  {!isCollapsed && <span>{item.label}</span>}
                </Button>
              </Link>
              {i === 0 && <Separator className="my-2" />}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Nav */}
        <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-card px-4 lg:px-6 shrink-0">
          {/* Brand - Mobile Only (Visible when md:hidden) */}
          <Link to="/dashboard" className="flex md:hidden items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold font-display">GigShield</span>
          </Link>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(true)}>
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">3</Badge>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback></Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 p-6 pb-24 md:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Nav Dock */}
      <MobileNavDock items={navItems} />

      <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </div>
  );
}
