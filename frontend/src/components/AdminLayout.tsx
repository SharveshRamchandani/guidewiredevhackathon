import { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Shield, LayoutDashboard, Users, FileText, AlertTriangle, Clock, BarChart3,
  ShieldAlert, Zap, Activity, Settings, UserPlus, UsersRound, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Menu, Search, Bell, Mail } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { useToast } from "@/hooks/use-toast";

import { sidebarGroups, platformGroup } from "@/config/adminNavConfig";
import { AdminMobileNavDock } from "@/components/AdminMobileNavDock";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { ExpandableChatDemo } from "@/components/ExpandableChatDemo";
import { SharedTopbar } from "@/components/SharedTopbar";
import { useEffect } from "react";
export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, isSuperAdmin, logout } = useAdminAuthStore();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("gigshield:admin-sidebar-collapsed") === "true";
  });
  const showSuperAdmin = isSuperAdmin();

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem("gigshield:admin-sidebar-collapsed", String(newState));
      return newState;
    });
  };
  const name = admin?.name || "Admin User";
  const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || (showSuperAdmin ? "SA" : "AD");

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");

  // ── Fetch live unread count every 30s ────────────────────────────────────
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const adminRaw = localStorage.getItem('admin-auth-storage');
        const token = adminRaw ? JSON.parse(adminRaw)?.state?.token : null;

        let endpoint = showSuperAdmin
          ? 'http://localhost:5000/api/notifications/superadmin/unread-count'
          : 'http://localhost:5000/api/notifications/admin/unread-count';

        const res = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(json.unreadCount ?? 0);
        }
      } catch { /* offline */ }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [showSuperAdmin]);

  const handleNotifOpen = (open: boolean) => {
    if (open) setUnreadCount(0);
    setNotificationsOpen(open);
  };

  // Route guard logic for super_admin features
  const isSuperAdminRoute = location.pathname.startsWith('/admin/staff') || location.pathname.startsWith('/admin/platform');
  if (!showSuperAdmin && isSuperAdminRoute) {
    // Handled by RequireSuperAdmin
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile, now full height */}
      <aside className={`hidden md:flex flex-col border border-border/40 bg-sidebar/70 backdrop-blur-xl h-[calc(100vh-2rem)] m-4 rounded-[2.5rem] p-2 space-y-1 sticky top-4 z-40 shrink-0 shadow-md dark:shadow-primary/5 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-60'}`}>
        <div className="flex items-center gap-2 mb-6 px-2 pt-2 justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 overflow-hidden">
            <Shield className="h-6 w-6 text-primary shrink-0" />
            {!isCollapsed && (
              <>
                <span className="font-bold font-display text-lg whitespace-nowrap">GigShield</span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium ml-auto whitespace-nowrap">
                  {showSuperAdmin ? "Super" : "Admin"}
                </span>
              </>
            )}
          </Link>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={toggleSidebarCollapse}>
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-1 overflow-x-hidden">
          {sidebarGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-4">
              {group.label && !isCollapsed && (
                <p className="px-3 py-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <Link key={item.route} to={item.route}>
                  <Button
                    variant="ghost"
                    className={`w-full gap-2 mb-1 rounded-xl transition-all duration-200 group ${location.pathname === item.route ? 'bg-primary/10 text-primary shadow-sm font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'} ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'}`}
                    size="sm"
                    title={item.label}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${location.pathname === item.route ? 'scale-110' : 'group-hover:scale-110'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              ))}
            </div>
          ))}

          {/* Super Admin only section */}
          {showSuperAdmin && (
            <div className="mb-4">
              <Separator className="my-3 mx-2 w-auto" />
              {!isCollapsed && (
                <p className="px-3 py-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {platformGroup.label}
                </p>
              )}
              {platformGroup.items.map((item) => (
                <Link key={item.route} to={item.route}>
                  <Button
                    variant="ghost"
                    className={`w-full gap-2 mb-1 rounded-xl transition-all duration-200 group ${location.pathname === item.route ? 'bg-primary/10 text-primary shadow-sm font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'} ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'}`}
                    size="sm"
                    title={item.label}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${location.pathname === item.route ? 'scale-110' : 'group-hover:scale-110'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Nav */}
        {/* Top Nav */}
        <SharedTopbar
          brandLink="/admin/dashboard"
          showSuperAdminBadge={showSuperAdmin}
          showSearch={true}
          searchValue={search}
          onSearchChange={setSearch}
          unreadCount={unreadCount}
          notificationsLink="/admin/notifications"
          onNotificationsOpen={() => handleNotifOpen(true)}
          initials={initials}
          userName={name}
          userJobTitle={admin?.jobTitle}
          profileLink="/admin/profile"
          onLogout={logout}
        />

        {/* Main */}
        <main className="flex-1 p-6 pb-24 md:pb-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Admin Mobile Nav Dock */}
      <AdminMobileNavDock />

      <NotificationsPanel open={notificationsOpen} onOpenChange={handleNotifOpen} />
      <ExpandableChatDemo />
    </div>
  );
}
