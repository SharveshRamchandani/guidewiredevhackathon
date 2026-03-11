import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
export function AdminLayout({ children }: { children: React.ReactNode }) {
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

  // Route guard logic for super_admin features
  const isSuperAdminRoute = location.pathname.startsWith('/admin/staff') || location.pathname.startsWith('/admin/platform');
  if (!showSuperAdmin && isSuperAdminRoute) {
    // Handled by RequireSuperAdmin
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile, now full height */}
      <aside className={`hidden md:flex flex-col border-r bg-card h-screen p-3 space-y-1 sticky top-0 z-40 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-60'}`}>
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
                    variant={location.pathname === item.route ? "secondary" : "ghost"}
                    className={`w-full gap-2 mb-1 border-l-2 border-transparent data-[active=true]:border-l-primary ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                    size="sm"
                    data-active={location.pathname === item.route}
                    title={item.label}
                  >
                    <item.icon className="h-4 w-4 shrink-0" /> {!isCollapsed && <span>{item.label}</span>}
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
                    variant={location.pathname === item.route ? "secondary" : "ghost"}
                    className={`w-full gap-2 mb-1 border-l-2 border-transparent data-[active=true]:border-l-primary ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                    size="sm"
                    data-active={location.pathname === item.route}
                    title={item.label}
                  >
                    <item.icon className="h-4 w-4 shrink-0" /> {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Nav */}
        <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4 lg:px-6 shrink-0">
          {/* Mobile hamburger menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b p-4">
                <SheetTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-bold font-display">GigShield</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                    {showSuperAdmin ? "Super Admin" : "Admin"}
                  </span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
                  {sidebarGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-1 mb-2">
                      {group.label && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                          {group.label}
                        </p>
                      )}
                      {group.items.map((item) => (
                        <Link key={item.route} to={item.route} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent ${location.pathname === item.route ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  ))}

                {showSuperAdmin && (
                  <div className="space-y-1 mt-4 border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">{platformGroup.label}</p>
                    {platformGroup.items.map(item => (
                      <Link key={item.route} to={item.route} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent ${location.pathname === item.route ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Brand - Mobile Only (Visible when md:hidden) */}
          <Link to="/admin/dashboard" className="flex md:hidden items-center gap-2 mr-6">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold font-display">GigShield</span>
          </Link>

          {/* Search Bar - Left/Center */}
          <div className="flex-1 flex justify-start max-md:px-2">
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full pl-9 pr-12 h-9 bg-muted/50 border-0"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>F
              </kbd>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="h-9 w-9 relative" asChild>
              <Link to="/admin/events">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center">
                  3
                </Badge>
                <span className="sr-only">Notifications</span>
              </Link>
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">{name}</DropdownMenuItem>
                {admin?.jobTitle && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">{admin.jobTitle}</DropdownMenuItem>
                )}
                <DropdownMenuItem asChild><Link to="/admin/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 p-6 pb-24 md:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Admin Mobile Nav Dock */}
      <AdminMobileNavDock />
    </div>
  );
}
