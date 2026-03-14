import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Zap, Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { adminDataApi } from "@/lib/api";

interface EventData {
  id: string;
  event_number?: string;
  type: string;
  zone_name?: string;
  city_name?: string;
  severity?: string;
  value?: string;
  verified?: boolean;
  claims_generated?: number;
  triggered_at?: string;
  source?: string;
}

const AdminEvents = () => {
  const { token } = useAdminAuthStore();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [simTrigger, setSimTrigger] = useState([25]);

  useEffect(() => {
    if (!token) return;

    const loadEvents = async () => {
      setLoading(true);
      try {
        const res = await adminDataApi.getEvents(token);
        setEvents((res.data || []) as unknown as EventData[]);
      } catch (err) {
        console.error("Admin events load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [token]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      <PageHeader title="Disruption Events" description="Monitor and simulate disruption events" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No disruption events found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.event_number || e.id.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="secondary">{e.type}</Badge></TableCell>
                    <TableCell>{e.zone_name || "All"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={e.severity === "critical" ? "high" : e.severity === "high" ? "high" : e.severity === "medium" ? "medium" : "low"}
                        label={e.severity || "—"}
                      />
                    </TableCell>
                    <TableCell><Switch checked={e.verified ?? false} /></TableCell>
                    <TableCell>{e.claims_generated || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(e.triggered_at)}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedEvent(e)}>View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Simulate Event</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select><SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger><SelectContent><SelectItem value="bandra">Bandra</SelectItem><SelectItem value="rohini">Rohini</SelectItem><SelectItem value="whitefield">Whitefield</SelectItem></SelectContent></Select>
            <Select><SelectTrigger><SelectValue placeholder="Event Type" /></SelectTrigger><SelectContent><SelectItem value="rain">Heavy Rain</SelectItem><SelectItem value="aqi">Poor AQI</SelectItem><SelectItem value="heat">Heatwave</SelectItem><SelectItem value="outage">Platform Outage</SelectItem></SelectContent></Select>
            <div><p className="text-sm text-muted-foreground mb-2">Trigger Value: {simTrigger[0]}</p><Slider value={simTrigger} onValueChange={setSimTrigger} max={100} /></div>
            <Input type="number" placeholder="Exact override value" />
            <ConfirmationDialog
              trigger={<Button variant="destructive" className="w-full">Simulate Event</Button>}
              title="Confirm Simulation"
              description="This will fire the real disruption pipeline and may trigger claims. Are you sure?"
              actionLabel="Simulate"
              variant="destructive"
              onConfirm={() => {}}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{selectedEvent?.event_number || selectedEvent?.id?.slice(0, 8)} — {selectedEvent?.type}</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{selectedEvent.zone_name || "All"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{selectedEvent.city_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Value</span><span>{selectedEvent.value || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Severity</span>
                <StatusBadge
                  status={selectedEvent.severity === "critical" || selectedEvent.severity === "high" ? "high" : selectedEvent.severity === "medium" ? "medium" : "low"}
                  label={selectedEvent.severity || "—"}
                />
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="capitalize">{selectedEvent.source || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Claims Generated</span><span>{selectedEvent.claims_generated || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(selectedEvent.triggered_at)}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminEvents;
