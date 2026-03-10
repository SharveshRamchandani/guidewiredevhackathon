import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, ShieldAlert, Settings, BarChart3, FileText, AlertTriangle, Zap, Clock, Building2, PlusCircle, Activity } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";

interface SubItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface DockGroup {
  label: string;
  icon: LucideIcon;
  paths: string[];
  items: SubItem[];
  superAdminOnly?: boolean;
}

const dockGroups: DockGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    paths: ["/admin/dashboard", "/admin/analytics"],
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Workforce",
    icon: Users,
    paths: ["/admin/workers", "/admin/policies"],
    items: [
      { label: "Workers", path: "/admin/workers", icon: Users },
      { label: "Policies", path: "/admin/policies", icon: FileText },
    ],
  },
  {
    label: "Risk",
    icon: ShieldAlert,
    paths: ["/admin/claims", "/admin/fraud"],
    items: [
      { label: "Claims", path: "/admin/claims", icon: AlertTriangle },
      { label: "Fraud Queue", path: "/admin/fraud", icon: ShieldAlert },
    ],
  },
  {
    label: "System",
    icon: Settings,
    paths: ["/admin/events", "/admin/cron"],
    items: [
      { label: "Events", path: "/admin/events", icon: Zap },
      { label: "Cron Engine", path: "/admin/cron", icon: Clock },
    ],
  },
  {
    label: "Platform",
    icon: Building2,
    paths: ["/admin/companies", "/admin/companies/new", "/admin/platform", "/admin/platform/settings"],
    items: [
      { label: "Companies", path: "/admin/companies", icon: Building2 },
      { label: "Create Company", path: "/admin/companies/new", icon: PlusCircle },
      { label: "Platform Stats", path: "/admin/platform", icon: Activity },
      { label: "Settings", path: "/admin/platform/settings", icon: Settings },
    ],
    superAdminOnly: true,
  },
];

export function AdminMobileNavDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminAuthStore();
  const [openGroup, setOpenGroup] = useState<number | null>(null);

  const visibleGroups = dockGroups.filter((g) => !g.superAdminOnly || isSuperAdmin());

  const handleGroupClick = (index: number) => {
    setOpenGroup(openGroup === index ? null : index);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpenGroup(null);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
      {/* Dropup submenu */}
      <AnimatePresence>
        {openGroup !== null && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenGroup(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-full mb-2 left-0 right-0 flex justify-center z-50"
            >
              <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-lg p-1.5 min-w-[160px]">
                {visibleGroups[openGroup]?.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dock bar */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex items-center gap-1 rounded-2xl px-2 py-2 shadow-lg border border-border/50 bg-card/95 backdrop-blur-md relative z-50"
      >
        {visibleGroups.map((group, index) => {
          const isGroupActive = group.paths.some((p) => location.pathname.startsWith(p));
          const isOpen = openGroup === index;
          const Icon = group.icon;

          return (
            <motion.button
              key={group.label}
              onClick={() => handleGroupClick(index)}
              className={cn(
                "relative flex flex-col items-center justify-center h-12 min-w-[56px] px-1.5 rounded-xl transition-colors",
                isGroupActive || isOpen
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
              whileHover={{ scale: 1.06, y: -3 }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5 leading-none">{group.label}</span>

              <AnimatePresence>
                {isGroupActive && (
                  <motion.span
                    layoutId="admin-nav-dot"
                    className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
