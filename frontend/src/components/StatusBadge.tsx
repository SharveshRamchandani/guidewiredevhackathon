import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "active" | "expired" | "pending" | "approved" | "rejected" | "verified" | "low" | "medium" | "high" | "critical" | "running" | "paused" | "custom";

const statusStyles: Record<StatusType, string> = {
  active: "bg-success/15 text-success border-success/30",
  expired: "bg-muted text-muted-foreground border-muted",
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  verified: "bg-success/15 text-success border-success/30",
  low: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
  critical: "bg-destructive text-destructive-foreground border-destructive",
  running: "bg-success/15 text-success border-success/30",
  paused: "bg-destructive/15 text-destructive border-destructive/30",
  custom: "bg-primary/15 text-primary border-primary/30",
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(statusStyles[status], className)}>
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
