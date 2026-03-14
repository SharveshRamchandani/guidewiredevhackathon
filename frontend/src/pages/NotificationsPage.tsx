import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconBell,
  IconDotsVertical,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconClipboard,
  IconTrash,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
// For demonstration purposes, we are importing useLocation to determine the current role route.
// In a real app, this might come from an Auth Context (e.g., useAuth().user.role).
import { useLocation } from "react-router-dom";

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  type?: 'success' | 'warning' | 'alert' | 'info';
  role?: string;
  userId?: string;
}

const mockWorkerNotifications: Notification[] = [
  {
    id: "w-1",
    message: "Heavy rainfall detected in your zone. A compensation claim of ₹450 has been auto-approved and credited to your account.",
    timestamp: "15 min ago",
    isRead: false,
    isFavorite: false,
    isArchived: false,
    type: 'success'
  },
  {
    id: "w-2",
    message: "Your weekly premium of ₹35 has been successfully deducted. Your policy is active.",
    timestamp: "2 hours ago",
    isRead: true,
    isFavorite: true,
    isArchived: false,
    type: 'success'
  },
  {
    id: "w-3",
    message: "Your recent claim CLM-008 was rejected due to location mismatch. 5 trust credits have been deducted.",
    timestamp: "1 day ago",
    isRead: true,
    isFavorite: false,
    isArchived: false,
    type: 'alert'
  },
  {
    id: "w-4",
    message: "Warning: Premium deduction failed. Please top-up your wallet to maintain active GigShield coverage.",
    timestamp: "5 days ago",
    isRead: true,
    isFavorite: false,
    isArchived: true,
    type: 'warning'
  }
];

const mockAdminNotifications: Notification[] = [
  {
    id: "a-0",
    message: "Platform Update: New dashboard metrics for claim tracking are now live.",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    isRead: false,
    isFavorite: true,
    isArchived: false,
    type: 'info'
  },
  { id: "a1", message: "Fraud Alert: Unusual claim activity detected for Worker W-402.", type: "alert", timestamp: new Date(Date.now() - 1800000).toISOString(), isRead: false, isFavorite: false, isArchived: false, role: "admin", userId: "demo" },
  { id: "a2", message: "Pending Review: 15 new claims require your approval today.", type: "warning", timestamp: new Date(Date.now() - 5400000).toISOString(), isRead: false, isFavorite: false, isArchived: false, role: "admin", userId: "demo" },
  { id: "a3", message: "KYC Verified: Worker W-509 has submitted valid documents.", type: "success", timestamp: new Date(Date.now() - 28800000).toISOString(), isRead: true, isFavorite: false, isArchived: false, role: "admin", userId: "demo" },
  { id: "a4", message: "System Update: New dashboard filters for payout tracking are live.", type: "info", timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true, isFavorite: false, isArchived: false, role: "admin", userId: "demo" },
];

const mockSuperAdminNotifications: Notification[] = [
  { id: "s1", message: "Critical: Low reserve funds detected in the payout wallet.", type: "alert", timestamp: new Date(Date.now() - 900000).toISOString(), isRead: false, isFavorite: false, isArchived: false, role: "superadmin", userId: "demo" },
  { id: "s2", message: "ML Model: Precision increased to 98.4% after the latest training cycle.", type: "success", timestamp: new Date(Date.now() - 10800000).toISOString(), isRead: false, isFavorite: false, isArchived: false, role: "superadmin", userId: "demo" },
  { id: "s3", message: "Governance: Staff member 'A. Sharma' promoted to Manager role.", type: "info", timestamp: new Date(Date.now() - 43200000).toISOString(), isRead: false, isFavorite: false, isArchived: false, role: "superadmin", userId: "demo" },
  { id: "s4", message: "Infrastructure: Database backup completed successfully (Snapshot #402).", type: "success", timestamp: new Date(Date.now() - 172800000).toISOString(), isRead: true, isFavorite: false, isArchived: false, role: "superadmin", userId: "demo" },
];

export default function NotificationsPage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Choose the right dummy set based on URL
  let initialData = mockWorkerNotifications;
  let currentRoleName = "Worker";

  if (location.pathname.includes('/admin/platform') || location.pathname.includes('/admin/staff')) {
    initialData = mockSuperAdminNotifications;
    currentRoleName = "Super Admin";
  } else if (location.pathname.includes('/admin')) {
    initialData = mockAdminNotifications;
    currentRoleName = "Admin";
  }

  const { data: apiResponse, isLoading, isError } = useQuery({
    queryKey: ["notifications", location.pathname],
    queryFn: async () => {
      // Determine the correct endpoint based on the current route's role
      let endpoint = "http://localhost:5000/api/notifications/worker";
      if (location.pathname.includes('/admin/platform') || location.pathname.includes('/admin/staff')) {
        endpoint = "http://localhost:5000/api/notifications/superadmin";
      } else if (location.pathname.includes('/admin')) {
        endpoint = "http://localhost:5000/api/notifications/admin";
      }

      let token = null;
      if (location.pathname.includes('/admin')) {
        const { useAdminAuthStore } = await import('@/stores/adminAuthStore');
        token = useAdminAuthStore.getState().token;
      } else {
        const { useWorkerAuthStore } = await import('@/stores/workerAuthStore');
        token = useWorkerAuthStore.getState().token;
      }

      const res = await fetch(endpoint, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const json = await res.json();
      // Backend returns { success, count, data: [...] }
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    retry: 1,
    staleTime: 10_000,
  });

  // apiResponse is the array from backend (or undefined while loading)
  const apiNotifications: Notification[] = Array.isArray(apiResponse) ? apiResponse : [];
  // Initialize with role-based dummy data by default
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(initialData);

  // Merge: real API notifications take priority over mock data.
  // If the API returned something, show it; otherwise fall back to role-based mock data
  // so the page never looks empty during a demo.
  useEffect(() => {
    if (apiNotifications.length > 0) {
      setLocalNotifications(apiNotifications);
    } else if (!isLoading) {
      // API returned empty (Redis offline + no events triggered yet) — keep mocks visible
      setLocalNotifications(initialData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiNotifications, isLoading]);

  // Use localNotifications directly so dummy data persists visually if API fails/empty
  const notifications = localNotifications;


  const toggleFavorite = (id: string) => {
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setLocalNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch = n.message.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "archive") return matchesSearch && n.isArchived;
    if (activeTab === "favorite") return matchesSearch && n.isFavorite;
    return matchesSearch && !n.isArchived;
  });

  const allCount = notifications.filter((n) => !n.isArchived).length;
  const archiveCount = notifications.filter((n) => n.isArchived).length;
  const favoriteCount = notifications.filter((n) => n.isFavorite).length;

  // Determine if it's currently demo mode
  const isDemoMode = apiNotifications.length === 0 && !isLoading;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader 
          title={`${currentRoleName} Notifications`} 
          description={isDemoMode ? "Currently showing example notifications. Trigger an action to see live updates." : "Real-time updates from GigShield platform."}
        />
        {isDemoMode && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 py-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <RefreshCw className="size-3 animate-spin" />
              DEMO DATA ACTIVE
            </span>
          </Badge>
        )}
      </div>

      <Card className="w-full overflow-hidden mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <IconBell className="size-6 text-primary" />
            <CardTitle className="text-xl font-semibold">Inbox</CardTitle>
            {!isLoading && (
              <Badge
                variant={!isDemoMode ? "default" : "outline"}
                className={cn("text-[10px] px-2 py-0.5 uppercase", !isDemoMode ? "bg-green-100 text-green-700 border-green-200" : "opacity-50")}
              >
                {!isDemoMode ? "🟢 Live Feed" : "⚪ Offline Mocks"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode && (
               <p className="text-[10px] text-muted-foreground mr-2 font-mono italic">
                 {location.pathname.includes('/admin') ? 'role: admin_view' : 'role: worker_view'}
               </p>
            )}
            <Button variant="ghost" size="icon">
              <IconDotsVertical className="size-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Count and Search */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {notifications.length} Notification
            </p>
            <div className="relative w-full sm:w-64">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Name Product"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
              <TabsTrigger value="all" className="gap-2">
                <Badge >
                  {allCount}
                </Badge>
                All
              </TabsTrigger>
              <TabsTrigger value="archive" className="gap-2">
                {archiveCount} Archive
              </TabsTrigger>
              <TabsTrigger value="favorite" className="gap-2">
                {favoriteCount} Favorite
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-1">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={cn(
                      "flex items-center gap-2 sm:gap-3 rounded-lg p-2 sm:p-3 transition-colors cursor-pointer min-w-0",
                      !notification.isRead
                        ? "bg-destructive/5 hover:bg-destructive/10"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {/* Unread indicator */}
                    <div
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        !notification.isRead ? "bg-primary" : "bg-transparent"
                      )}
                    />

                    {/* Favorite toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(notification.id);
                      }}
                    >
                      {notification.isFavorite ? (
                        <IconStarFilled className="size-4 text-yellow-500" />
                      ) : (
                        <IconStar className="size-4 text-muted-foreground" />
                      )}
                    </Button>

                    {/* Clipboard icon - hidden on mobile */}
                    <Button variant="ghost" size="icon" className="size-8 shrink-0 hidden sm:flex">
                      <IconClipboard className="size-4 text-muted-foreground" />
                    </Button>

                    {/* Message */}
                    <p className="flex-1 truncate text-sm min-w-0">{notification.message}</p>

                    {/* Timestamp */}
                    <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {notification.timestamp}
                    </span>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                ))}

                {filteredNotifications.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    No notifications found
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
