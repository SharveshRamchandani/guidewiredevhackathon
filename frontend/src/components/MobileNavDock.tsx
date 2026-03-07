import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavDockItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface MobileNavDockProps {
  items: NavDockItem[];
  className?: string;
}

export function MobileNavDock({ items, className }: MobileNavDockProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={cn("fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden", className)}>
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex items-center gap-1 rounded-2xl px-2 py-2 shadow-lg border border-border/50 bg-card/95 backdrop-blur-md"
      >
        {items.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center h-12 min-w-[52px] px-2 rounded-xl transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
              whileHover={{ scale: 1.08, y: -4 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5 leading-none">{item.label}</span>

              {/* Active indicator dot */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="nav-dot"
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
