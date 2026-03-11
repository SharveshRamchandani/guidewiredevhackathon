import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle } from "lucide-react";

const zoneOverrides = [
  { zone: "Bandra", city: "Mumbai", interval: null as number | null },
  { zone: "Rohini", city: "Delhi", interval: 15 },
  { zone: "Whitefield", city: "Bangalore", interval: null as number | null },
];

const auditLog = [
  { time: "5 Mar 10:30", user: "admin@gigshield.in", field: "interval", from: "5", to: "10" },
  { time: "4 Mar 14:15", user: "admin@gigshield.in", field: "payout_delay", from: "30", to: "60" },
  { time: "3 Mar 09:00", user: "admin@gigshield.in", field: "engine_active", from: "true", to: "false" },
];

const AdminCron = () => {
  const { toast } = useToast();
  const [engineActive, setEngineActive] = useState(true);
  const [interval, setInterval] = useState([10]);
  const [payoutDelay, setPayoutDelay] = useState("60");
  const [changed, setChanged] = useState(false);

  return (
    <>
      <PageHeader title="Cron Config" description="Configure the trigger engine and scheduling" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Card */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Engine Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={engineActive ? "running" : "paused"} />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Run</span>
              <span className="text-sm">5 Mar 2026, 10:30 AM</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Next Run</span>
              <Badge variant="outline">In {interval[0]} minutes</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Kill Switch */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Master Kill Switch</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Trigger Engine Active</Label>
              {engineActive ? (
                <ConfirmationDialog
                  trigger={<Switch checked={engineActive} />}
                  title="Disable Trigger Engine?"
                  description="This will stop all automatic claim triggers. Manual claims will still work."
                  actionLabel="Disable"
                  variant="destructive"
                  onConfirm={() => { setEngineActive(false); setChanged(true); }}
                />
              ) : (
                <Switch checked={engineActive} onCheckedChange={() => { setEngineActive(true); setChanged(true); }} />
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Check Interval: {interval[0]} min</Label>
                <Input type="number" className="w-20" value={interval[0]} onChange={(e) => { setInterval([Number(e.target.value)]); setChanged(true); }} />
              </div>
              <Slider value={interval} onValueChange={(v) => { setInterval(v); setChanged(true); }} min={1} max={60} step={1} />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Payout Delay (seconds)</Label>
                <HoverCard>
                  <HoverCardTrigger><HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" /></HoverCardTrigger>
                  <HoverCardContent className="text-sm">Delay between claim approval and payout initiation. Allows time for fraud checks.</HoverCardContent>
                </HoverCard>
              </div>
              <Input type="number" value={payoutDelay} onChange={(e) => { setPayoutDelay(e.target.value); setChanged(true); }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Overrides */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="font-display text-lg">Zone Overrides</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Zone</TableHead><TableHead>City</TableHead><TableHead>Override Interval</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {zoneOverrides.map((z) => (
                <TableRow key={z.zone}>
                  <TableCell className="font-medium">{z.zone}</TableCell>
                  <TableCell>{z.city}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input type="number" className="w-20" placeholder="Default" defaultValue={z.interval ?? ""} onChange={() => setChanged(true)} />
                      <span className="text-sm text-muted-foreground">min</span>
                      {z.interval && <Badge variant="outline" className="bg-primary/10 text-primary">Custom</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">Save</Button>
                      <Button variant="ghost" size="sm">Reset</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="font-display text-lg">Audit Log</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Field</TableHead><TableHead>From</TableHead><TableHead>To</TableHead></TableRow></TableHeader>
              <TableBody>
                {auditLog.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{l.time}</TableCell>
                    <TableCell className="text-sm">{l.user}</TableCell>
                    <TableCell><Badge variant="secondary">{l.field}</Badge></TableCell>
                    <TableCell className="text-sm">{l.from}</TableCell>
                    <TableCell className="text-sm">{l.to}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Button disabled={!changed} onClick={() => { setChanged(false); toast({ title: "Configuration saved" }); }}>Save Configuration</Button>
    </>
  );
};

export default AdminCron;
