import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";

const Profile = () => {
  const { toast } = useToast();
  const { worker } = useWorkerAuthStore();
  
  const [name, setName] = useState(worker?.name || "Ramesh Kumar");
  const [phone, setPhone] = useState(worker?.phone || "");
  const [zone, setZone] = useState("Bandra");
  const [earnings, setEarnings] = useState("5000");

  const [sms, setSms] = useState(true);
  const [push, setPush] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);

  const handleSave = () => {
    toast({ title: "Profile updated", description: "Your changes have been saved." });
  };
  
  const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "RK";

  return (
      <div className="max-w-2xl">
        <PageHeader title="Profile" description="Manage your account settings" />

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl bg-primary text-primary-foreground font-display">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold font-display">{name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">Worker</Badge>
              <Badge variant="outline" className="bg-success/15 text-success border-success/30">KYC Verified</Badge>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phone} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Zone</Label>
              <Input value={zone} onChange={(e) => setZone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Avg Weekly Earnings (₹)</Label>
              <Input type="number" value={earnings} onChange={(e) => setEarnings(e.target.value)} />
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-0">
            <h3 className="font-semibold font-display mb-4">Notification Preferences</h3>
            {[
              { label: "SMS Notifications", checked: sms, onChange: setSms },
              { label: "Push Notifications", checked: push, onChange: setPush },
              { label: "WhatsApp Updates", checked: whatsapp, onChange: setWhatsapp },
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

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold font-display text-destructive">Danger Zone</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <ConfirmationDialog
                trigger={<Button variant="destructive">Cancel Policy</Button>}
                title="Cancel Policy"
                description="Are you sure you want to cancel your active policy? This action cannot be undone and you will lose coverage immediately."
                actionLabel="Yes, Cancel Policy"
                variant="destructive"
                onConfirm={() => toast({ title: "Policy cancelled", variant: "destructive" })}
              />
              <ConfirmationDialog
                trigger={<Button variant="destructive">Delete Account</Button>}
                title="Delete Account"
                description="This will permanently delete your account and all associated data. This action cannot be undone."
                actionLabel="Yes, Delete Account"
                variant="destructive"
                onConfirm={() => toast({ title: "Account deleted", variant: "destructive" })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default Profile;
