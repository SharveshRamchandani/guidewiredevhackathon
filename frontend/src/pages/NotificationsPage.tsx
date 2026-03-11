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
    id: "a-1",
    message: "Alert: Weather-triggered parametric payout executed for W-102 (₹450) in Bandra zone.",
    timestamp: "15 min ago",
    isRead: false,
    isFavorite: true,
    isArchived: false,
    type: 'info'
  },
  {
    id: "a-2",
    message: "Fraud Alert: Suspicious claim CLM-008 submitted by W-102. Account flagged for manual review.",
    timestamp: "1 day ago",
    isRead: false,
    isFavorite: false,
    isArchived: false,
    type: 'alert'
  },
  {
    id: "a-3",
    message: "New worker W-105 registration pending KYC verification.",
    timestamp: "2 days ago",
    isRead: true,
    isFavorite: false,
    isArchived: true,
    type: 'info'
  }
];

const mockSuperAdminNotifications: Notification[] = [
  {
    id: "sa-1",
    message: "Platform Alert: Reserve payout pool running low. Requires top-up.",
    timestamp: "10 min ago",
    isRead: false,
    isFavorite: true,
    isArchived: false,
    type: 'alert'
  },
  {
    id: "sa-2",
    message: "ML Model training completed successfully using recent sales data.",
    timestamp: "1 hour ago",
    isRead: false,
    isFavorite: false,
    isArchived: false,
    type: 'success'
  },
  {
    id: "sa-3",
    message: "Admin activity report generated for last week.",
    timestamp: "3 days ago",
    isRead: true,
    isFavorite: false,
    isArchived: true,
    type: 'info'
  }
];

export default function NotificationsPage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Determine which dummy data to show based on the route
  let initialData = mockWorkerNotifications;
  if (location.pathname.includes('/admin/platform') || location.pathname.includes('/admin/staff')) {
    initialData = mockSuperAdminNotifications;
  } else if (location.pathname.includes('/admin')) {
    initialData = mockAdminNotifications;
  }

  const { data: apiNotifications = [], isLoading } = useQuery({
    queryKey: ["notifications", location.pathname],
    queryFn: async () => {
      // Determine the correct endpoint based on the route role
      let endpoint = "http://localhost:5000/api/notifications/worker";
      if (location.pathname.includes('/admin/platform') || location.pathname.includes('/admin/staff')) {
        endpoint = "http://localhost:5000/api/notifications/superadmin";
      } else if (location.pathname.includes('/admin')) {
        endpoint = "http://localhost:5000/api/notifications/admin";
      }

      // We need to pass the JWT token to authenticate the request
      const token = localStorage.getItem('token');

      const res = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    }
  });

  // Initialize with role-based dummy data by default
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(initialData);

  // Update local state when API data changes
  useEffect(() => {
    if (apiNotifications.length > 0) {
      setLocalNotifications(apiNotifications);
    }
  }, [apiNotifications]);

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

  return (
    <div>
      <PageHeader title="Notifications" />
      <Card className="w-full overflow-hidden mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <IconBell className="size-6" />
            <CardTitle className="text-xl font-semibold">List Notification</CardTitle>
          </div>
          <Button variant="ghost" size="icon">
            <IconDotsVertical className="size-5" />
          </Button>
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
