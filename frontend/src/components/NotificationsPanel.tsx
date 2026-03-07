import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CloudRain, AlertTriangle, CheckCircle } from "lucide-react";

const notifications = [
  { id: 1, title: "Claim Approved", message: "Your rain disruption claim for ₹450 has been approved.", time: "2 hours ago", read: false, icon: <CheckCircle className="h-4 w-4 text-success" /> },
  { id: 2, title: "Heavy Rain Alert", message: "Heavy rainfall expected in your zone today. Disruption coverage active.", time: "5 hours ago", read: false, icon: <CloudRain className="h-4 w-4 text-primary" /> },
  { id: 3, title: "Policy Renewal", message: "Your weekly policy renews in 2 days. Ensure UPI is active.", time: "1 day ago", read: false, icon: <AlertTriangle className="h-4 w-4 text-warning" /> },
  { id: 4, title: "Payout Received", message: "₹320 has been credited to your UPI account.", time: "3 days ago", read: true, icon: <CheckCircle className="h-4 w-4 text-success" /> },
];

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsPanel({ open, onOpenChange }: NotificationsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notifications
            </SheetTitle>
            <Button variant="ghost" size="sm">Mark All Read</Button>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          <div className="space-y-0">
            {notifications.map((n, i) => (
              <div key={n.id}>
                <div className={`p-4 rounded-lg ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{n.title}</p>
                        {!n.read && <Badge className="h-2 w-2 p-0 rounded-full" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
                {i < notifications.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
