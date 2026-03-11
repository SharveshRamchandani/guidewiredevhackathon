import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuthStore } from "@/stores/adminAuthStore";

const AdminProfile = () => {
  const { toast } = useToast();
  const { admin, role: currentRole } = useAdminAuthStore();

  const [name, setName] = useState(admin?.name || "Admin User");
  const [email, setEmail] = useState(admin?.email || "admin@example.com");
  const [role, setRole] = useState(currentRole === "super_admin" ? "Super Admin" : "Admin");
  
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState(true);

  const handleSave = () => {
    toast({ title: "Profile updated", description: "Your changes have been saved." });
  };
  
  const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "AD";

  return (
      <div className="max-w-2xl">
        <PageHeader title="Profile" description="Manage your admin account settings" />

        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl bg-primary text-primary-foreground font-display">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold font-display">{name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{role}</Badge>
              {admin?.jobTitle && <Badge variant="outline">{admin.jobTitle}</Badge>}
              <Badge variant="outline" className="bg-success/15 text-success border-success/30">2FA Enabled</Badge>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={role} disabled className="bg-muted" />
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-0">
            <h3 className="font-semibold font-display mb-4">Notification Preferences</h3>
            {[
              { label: "Email Notifications", checked: emailNotifs, onChange: setEmailNotifs },
              { label: "Slack Alerts", checked: slackNotifs, onChange: setSlackNotifs },
              { label: "Critical Alerts (SMS)", checked: criticalAlerts, onChange: setCriticalAlerts },
            ].map((pref, i) => (
              <div key={pref.label}>
                <div className="flex items-center justify-between py-3">
                  <Label>{pref.label}</Label>
                  <Switch checked={pref.checked} onCheckedChange={pref.onChange} />
                </div>
                {i < 2 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold font-display">Security</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => toast({ title: "Password reset email sent" })}>Change Password</Button>
              <Button variant="outline" onClick={() => toast({ title: "2FA settings updated" })}>Manage 2FA</Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default AdminProfile;
