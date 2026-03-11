import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, ShieldAlert, Settings, BarChart3, FileText, AlertTriangle, Zap, Clock, Building2, PlusCircle, Activity } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { bottomTabs, platformGroup, footerItems, sidebarGroups } from "@/config/adminNavConfig";

export function AdminMobileNavDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminAuthStore();
  const [openGroup, setOpenGroup] = useState<number | null>(null);

  const visibleGroups = bottomTabs;

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
                {(() => {
                  const currentGroup = visibleGroups[openGroup];
                  if (!currentGroup) return null;

                  // If it's the "More" tab, render role-based content
                  if (currentGroup.label === "More") {
                    const moreItems = [
                      ...(isSuperAdmin() ? platformGroup.items : []),
                      ...footerItems,
                    ];
                    return (
                      <div className="flex flex-col gap-1">
                        {isSuperAdmin() && (
                          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {platformGroup.label}
                          </div>
                        )}
                        {moreItems.map((item) => {
                          const isActive = location.pathname === item.route;
                          const Icon = item.icon;
                          return (
                            <motion.button
                              key={item.route}
                              onClick={() => handleNavigate(item.route)}
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
                    );
                  }

                  // Standard sub-items mapped from sidebarGroups
                  const allSidebarItems = sidebarGroups.flatMap((group) => group.items);
                  const groupItems = currentGroup.routes
                    .map((route) => allSidebarItems.find((item) => item.route === route))
                    .filter((item): item is NonNullable<typeof item> => item !== undefined);
                  
                  if (groupItems.length === 0) return null;

                  return (
                    <div className="flex flex-col gap-1">
                      {groupItems.map((item) => {
                        const isActive = location.pathname === item.route;
                        const Icon = item.icon;
                        return (
                          <motion.button
                            key={item.route}
                            onClick={() => handleNavigate(item.route)}
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
                  );
                })()}
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
          const isGroupActive = group.routes.some((p) => location.pathname.startsWith(p));
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
