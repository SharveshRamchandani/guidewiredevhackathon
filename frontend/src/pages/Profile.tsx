import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
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
import { ApiError, workerApi } from "@/lib/api";

type UpiLockState = {
  isLocked?: boolean;
  lockedUntil?: string | null;
  riskScore?: number;
  reason?: string | null;
  previousUpiId?: string | null;
  lastChangedAt?: string | null;
};

const Profile = () => {
  const { toast } = useToast();
  const { worker, token } = useWorkerAuthStore();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [zone, setZone] = useState("");
  const [earnings, setEarnings] = useState("");
  const [upi, setUpi] = useState("");
  const [upiLock, setUpiLock] = useState<UpiLockState>({});

  const [sms, setSms] = useState(true);
  const [push, setPush] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);

  const loadProfile = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await workerApi.getProfile(token);
      const data = res.data;
      setProfile(data);
      setName((data.name as string) || "");
      setPhone((data.phone as string) || "");
      setCity((data.city as string) || "");
      setZone((data.zone_name as string) || "");
      setEarnings(String(data.avg_weekly_earning || data.weekly_earnings || ""));
      setUpi((data.upi_id as string) || "");
      setUpiLock((data.upi_lock as UpiLockState) || {});

      const notifs = data.notifications as Record<string, boolean> | undefined;
      if (notifs) {
        setSms(notifs.sms ?? true);
        setPush(notifs.push ?? true);
        setWhatsapp(notifs.whatsapp ?? false);
      }
    } catch (err) {
      console.error("Profile load error:", err);
      if (worker) {
        setName(worker.name || "");
        setPhone(worker.phone || "");
      }
      toast({
        title: "Could not load profile",
        description: err instanceof Error ? err.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [token]);

  const handleSaveProfile = async () => {
    if (!token) return;

    setSavingProfile(true);
    try {
      const res = await workerApi.updateProfile(token, {
        name,
        city,
        avg_weekly_earning: earnings ? Number(earnings) : undefined,
      });
      setProfile((prev) => ({ ...(prev || {}), ...(res.data || {}) }));
      toast({ title: "Profile updated", description: res.message });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not update profile.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveUpi = async () => {
    if (!token) return;

    setSavingUpi(true);
    try {
      const res = await workerApi.updateUpi(token, upi.trim());
      const nextLock = (res.data?.upi_lock as UpiLockState) || {};
      setProfile((prev) => ({ ...(prev || {}), ...(res.data || {}) }));
      setUpiLock(nextLock);
      toast({
        title: nextLock.isLocked ? "UPI Risk Lock activated" : "UPI updated",
        description: res.message,
      });
    } catch (err) {
      const description = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Could not update payout UPI.";
      toast({ title: "UPI update failed", description, variant: "destructive" });
    } finally {
      setSavingUpi(false);
    }
  };

  const initials = useMemo(
    () => name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "W",
    [name]
  );

  const isKycVerified = profile?.is_kyc_verified === true || profile?.kyc_status === "verified";
  const lockUntilLabel = upiLock.lockedUntil
    ? new Date(upiLock.lockedUntil).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  if (loading) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Profile" description="Manage your account settings" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" description="Manage your account settings" />

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl bg-primary text-primary-foreground font-display">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold font-display">{name || "Worker"}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary">Worker</Badge>
            <Badge
              variant="outline"
              className={
                isKycVerified
                  ? "bg-success/15 text-success border-success/30"
                  : "bg-warning/15 text-warning border-warning/30"
              }
            >
              {isKycVerified ? "KYC Verified" : "KYC Pending"}
            </Badge>
            {profile?.platform && <Badge variant="outline">{profile.platform as string}</Badge>}
            {upiLock.isLocked && (
              <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
                UPI Risk Lock
              </Badge>
            )}
          </div>
        </div>
      </div>

      {upiLock.isLocked && (
        <Card className="mb-6 border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h3 className="font-semibold font-display">UPI Risk Lock Active</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Payouts are paused until {lockUntilLabel || "the verification window ends"} because
                  your payout UPI changed recently.
                </p>
                {upiLock.reason && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Signal: {upiLock.reason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Risk score: {Number(upiLock.riskScore || 0).toFixed(2)}
                  {upiLock.previousUpiId ? ` | Previous UPI: ${upiLock.previousUpiId}` : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Zone</Label>
            <Input value={zone} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Avg Weekly Earnings (INR)</Label>
            <Input type="number" value={earnings} onChange={(e) => setEarnings(e.target.value)} />
          </div>
          <Button onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold font-display">UPI Payout Security</h3>
          </div>

          <div className="space-y-2">
            <Label>Payout UPI ID</Label>
            <Input
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="name@okicici"
            />
            <p className="text-xs text-muted-foreground">
              If this UPI changes during an active claim or payout window, the system temporarily
              pauses payouts to protect against account takeover.
            </p>
          </div>

          <Button variant="secondary" onClick={handleSaveUpi} disabled={savingUpi || !upi.trim()}>
            {savingUpi && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update UPI
          </Button>
        </CardContent>
      </Card>

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
