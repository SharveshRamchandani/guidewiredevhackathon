import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, AlertTriangle, Info, ShieldAlert, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  message: string;
  role: string;
  userId: string;
  type: 'success' | 'warning' | 'alert' | 'info';
  timestamp: string;
  isRead: boolean;
  isFavorite: boolean;
  isArchived: boolean;
}

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case 'success': return <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />;
    case 'alert':   return <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
    default:        return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
  }
}

function relativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

// ─── Token helper (reads from Zustand persisted stores) ───────────────────────

function getToken(): string | null {
  try {
    // Try worker store
    const workerRaw = localStorage.getItem('worker-auth-storage');
    if (workerRaw) {
      const token = JSON.parse(workerRaw)?.state?.token;
      if (token) return token;
    }
    // Try admin store
    const adminRaw = localStorage.getItem('admin-auth-storage');
    if (adminRaw) {
      const token = JSON.parse(adminRaw)?.state?.token;
      if (token) return token;
    }
  } catch {}
  return localStorage.getItem('token'); // fallback
}

// ─── Determine endpoint from current path ─────────────────────────────────────

function getEndpoint(): string {
  const p = window.location.pathname;
  if (p.includes('/admin/platform') || p.includes('/admin/staff'))
    return 'http://localhost:5000/api/notifications/superadmin';
  if (p.includes('/admin'))
    return 'http://localhost:5000/api/notifications/admin';
  return 'http://localhost:5000/api/notifications/worker';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsPanel({ open, onOpenChange }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res   = await fetch(getEndpoint(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      // backend returns { success, count, data: [...] }
      const list: Notification[] = Array.isArray(json) ? json : (json.data ?? []);
      setNotifications(list.filter(n => !n.isArchived).slice(0, 20));
    } catch {
      // silently retain existing notifications
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when the panel opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // ── Mark as read via API + local state ──────────────────────────────────────
  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      const token = getToken();
      const role  = window.location.pathname.includes('/admin') ? 'admin' : 'worker';
      await fetch(`http://localhost:5000/api/notifications/${role}/${id}/read`, {
        method:  'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* best-effort */ }
  };

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      const token = getToken();
      const role  = window.location.pathname.includes('/admin') ? 'admin' : 'worker';
      await fetch(`http://localhost:5000/api/notifications/${role}/mark-all-read`, {
        method:  'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* best-effort */ }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] sm:w-[400px] flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="h-5 px-1.5 text-[10px]">{unreadCount}</Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchNotifications} title="Refresh">
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="py-2">
            {loading && notifications.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs opacity-70">Actions like claims and payouts trigger them</p>
              </div>
            )}

            {notifications.map((n, i) => (
              <div key={n.id}>
                <div
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                    !n.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                  )}
                  onClick={() => markRead(n.id)}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !n.isRead && "font-medium")}>
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {relativeTime(n.timestamp)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                {i < notifications.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-3 shrink-0">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild onClick={() => onOpenChange(false)}>
            <Link to={window.location.pathname.includes('/admin') ? '/admin/notifications' : '/notifications'}>
              View all notifications →
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
