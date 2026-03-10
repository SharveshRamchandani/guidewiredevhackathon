import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { RequireSuperAdmin } from "@/components/RequireSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Download, Cpu, Loader2 } from "lucide-react";
import { format } from "date-fns";

const thresholds = [
  { type: "Heavy Rain", condition: "> X mm/hr", threshold: 25, payout: 100 },
  { type: "Flood", condition: "Water level > X cm", threshold: 50, payout: 100 },
  { type: "Heat Wave", condition: "> X°C for 3+ hrs", threshold: 42, payout: 75 },
  { type: "Road Accident", condition: "Verified via partner API", threshold: 1, payout: 100 },
  { type: "Air Quality", condition: "AQI > X", threshold: 300, payout: 50 },
  { type: "Earthquake", condition: "Magnitude > X", threshold: 4.5, payout: 100 },
];

const auditLog = [
  { action: "Threshold Updated", who: "Super Admin", role: "super_admin", target: "Heavy Rain", oldVal: "20", newVal: "25", timestamp: "2026-03-08 14:32" },
  { action: "Engine Paused", who: "Super Admin", role: "super_admin", target: "Cron Engine", oldVal: "Running", newVal: "Paused", timestamp: "2026-03-07 09:15" },
  { action: "Model Retrained", who: "System", role: "system", target: "ML Model", oldVal: "v2.3", newVal: "v2.4", timestamp: "2026-03-06 16:48" },
  { action: "Company Created", who: "Super Admin", role: "super_admin", target: "FleetProtect India", oldVal: "—", newVal: "Active", timestamp: "2026-03-05 11:22" },
  { action: "Payout Delay Changed", who: "Super Admin", role: "super_admin", target: "Global Config", oldVal: "30 min", newVal: "45 min", timestamp: "2026-03-04 08:30" },
];

const AdminGlobalSettings = () => {
  const { toast } = useToast();
  const [engineActive, setEngineActive] = useState(true);
  const [interval, setInterval] = useState([15]);
  const [thresholdValues, setThresholdValues] = useState(thresholds.map((t) => t.threshold));
  const [changed, setChanged] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [retraining, setRetraining] = useState(false);

  const handleThresholdChange = (index: number, value: string) => {
    const updated = [...thresholdValues];
    updated[index] = parseFloat(value) || 0;
    setThresholdValues(updated);
  };

  const handleRetrain = async () => {
    setRetraining(true);
    await new Promise((r) => setTimeout(r, 2000));
    setRetraining(false);
    toast({ title: "Model retrained", description: "ML model v2.5 is now active." });
  };

  return (
    <RequireSuperAdmin>
      <AdminLayout>
        <PageHeader title="Global Settings" description="Platform-wide configuration affecting all companies and workers" />

        {/* Cron Engine */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Cron Engine</CardTitle>
              <Badge variant={engineActive ? "default" : "destructive"} className={engineActive ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}>
                {engineActive ? "Running" : "Paused"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Master Kill Switch</Label>
                <p className="text-xs text-muted-foreground">Pause all automated event polling globally</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Switch checked={engineActive} />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{engineActive ? "Pause" : "Resume"} Cron Engine?</AlertDialogTitle>
                    <AlertDialogDescription>This will {engineActive ? "stop" : "start"} all automated event polling across every company on the platform.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setEngineActive(!engineActive); setChanged(true); }}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Global Poll Interval: {interval[0]} min</Label>
              <div className="flex items-center gap-4">
                <Slider value={interval} onValueChange={(v) => { setInterval(v); setChanged(true); }} min={1} max={60} step={1} className="flex-1" />
                <Input type="number" value={interval[0]} onChange={(e) => { setInterval([parseInt(e.target.value) || 1]); setChanged(true); }} className="w-20" />
              </div>
            </div>
            <Button disabled={!changed} onClick={() => { setChanged(false); toast({ title: "Configuration saved" }); }}>Save</Button>
          </CardContent>
        </Card>

        {/* Trigger Thresholds */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Trigger Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disruption Type</TableHead>
                  <TableHead className="hidden md:table-cell">Trigger Condition</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead className="hidden md:table-cell">Payout %</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {thresholds.map((t, i) => (
                  <TableRow key={t.type}>
                    <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{t.condition}</TableCell>
                    <TableCell><Input value={thresholdValues[i]} onChange={(e) => handleThresholdChange(i, e.target.value)} className="w-20 h-8" /></TableCell>
                    <TableCell className="hidden md:table-cell">{t.payout}%</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => toast({ title: `${t.type} threshold saved` })}>Save</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ML Model */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">ML Model Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>v2.4</Badge>
              <span className="text-sm text-muted-foreground">Last retrained: 2026-03-06 16:48</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={retraining}>
                  {retraining ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Retraining…</> : <><Cpu className="h-4 w-4 mr-1" /> Trigger Manual Retrain</>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Retrain ML Model?</AlertDialogTitle>
                  <AlertDialogDescription>This will start a full retraining cycle using the latest platform data. The process may take several minutes.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRetrain}>Start Retrain</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Platform Audit Log */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">Platform Audit Log</CardTitle>
              <div className="flex gap-2">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="All actions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="threshold">Threshold Updates</SelectItem>
                    <SelectItem value="engine">Engine Changes</SelectItem>
                    <SelectItem value="company">Company Actions</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                      {dateRange ? format(dateRange, "PP") : "Date filter"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={dateRange} onSelect={setDateRange} />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" className="h-8" onClick={() => toast({ title: "CSV exported" })}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead className="hidden md:table-cell">Target</TableHead>
                    <TableHead className="hidden lg:table-cell">Old</TableHead>
                    <TableHead className="hidden lg:table-cell">New</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="outline">{entry.action}</Badge></TableCell>
                      <TableCell>
                        <span className="text-sm">{entry.who}</span>
                        <Badge variant="secondary" className="ml-1 text-[10px]">{entry.role}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{entry.target}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{entry.oldVal}</TableCell>
                      <TableCell className="hidden lg:table-cell">{entry.newVal}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{entry.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </AdminLayout>
    </RequireSuperAdmin>
  );
};

export default AdminGlobalSettings;
