import { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
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
import { ExpandableChatDemo } from "@/components/ExpandableChatDemo";
import { SharedTopbar } from "@/components/SharedTopbar";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Policy", path: "/policy", icon: FileText },
  { label: "Claims", path: "/claims", icon: AlertTriangle },
  { label: "Payouts", path: "/payouts", icon: Wallet },
  // { label: "Profile", path: "/profile", icon: User },
  // { label: "Notifications", path: "/notifications", icon: Bell },
];

export function WorkerLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("gigshield:sidebar-collapsed") === "true";
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { worker, logout } = useWorkerAuthStore();
  const initials = worker?.name
    ? worker.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  // ── Fetch live unread count every 30s ────────────────────────────────────
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const raw = localStorage.getItem('worker-auth-storage');
        const token = raw ? JSON.parse(raw)?.state?.token : null;
        const res = await fetch('http://localhost:5000/api/notifications/worker/unread-count', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(json.unreadCount ?? 0);
        }
      } catch { /* offline — keep previous count */ }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Reset badge when panel opens (user is reading them)
  const handleNotifOpen = (open: boolean) => {
    if (open) setUnreadCount(0);
    setNotificationsOpen(open);
  };

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem("gigshield:sidebar-collapsed", String(newState));
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile, now full height */}
      <aside className={`hidden md:flex flex-col border border-border/40 bg-sidebar/70 backdrop-blur-xl h-[calc(100vh-2rem)] m-4 rounded-[2.5rem] p-3 space-y-1 sticky top-4 z-40 shrink-0 shadow-md dark:shadow-primary/5 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-60'}`}>
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
                <Button
                  variant="ghost"
                  className={`w-full gap-2 mb-1 rounded-xl transition-all duration-200 group ${location.pathname === item.path ? 'bg-primary/10 text-primary shadow-sm font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'} ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'}`}
                  size="sm"
                  title={item.label}
                >
                  <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`} />
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
        {/* Top Nav */}
        <SharedTopbar
          brandLink="/dashboard"
          showSearch={false}
          unreadCount={unreadCount}
          notificationsLink="/notifications"
          onNotificationsOpen={() => handleNotifOpen(true)}
          initials={initials}
          userName={worker?.name}
          profileLink="/profile"
          onLogout={logout}
        />

        {/* Main */}
        <main className="flex-1 p-6 pb-24 md:pb-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Mobile Nav Dock */}
      <MobileNavDock items={navItems} />

      <NotificationsPanel open={notificationsOpen} onOpenChange={handleNotifOpen} />
      <ExpandableChatDemo />
    </div>
  );
}
