import { useState } from "react";
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
import { Zap } from "lucide-react";

const events = [
  { id: "EVT-001", type: "Heavy Rain", zone: "Bandra", severity: "High", value: "45mm", verified: true, claims: 23, date: "28 Feb 2026" },
  { id: "EVT-002", type: "Poor AQI", zone: "Rohini", severity: "Medium", value: "AQI 340", verified: true, claims: 15, date: "27 Feb 2026" },
  { id: "EVT-003", type: "Platform Outage", zone: "All", severity: "High", value: "3.5 hrs", verified: false, claims: 42, date: "26 Feb 2026" },
];

const AdminEvents = () => {
  const [selectedEvent, setSelectedEvent] = useState<typeof events[0] | null>(null);
  const [simTrigger, setSimTrigger] = useState([25]);

  return (
    <>
      <PageHeader title="Disruption Events" description="Monitor and simulate disruption events" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Type</TableHead><TableHead>Zone</TableHead><TableHead>Severity</TableHead><TableHead>Verified</TableHead><TableHead>Claims</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.id}</TableCell>
                  <TableCell><Badge variant="secondary">{e.type}</Badge></TableCell>
                  <TableCell>{e.zone}</TableCell>
                  <TableCell><StatusBadge status={e.severity === "High" ? "high" : "medium"} label={e.severity} /></TableCell>
                  <TableCell><Switch checked={e.verified} /></TableCell>
                  <TableCell>{e.claims}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedEvent(e)}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <DialogHeader><DialogTitle className="font-display">{selectedEvent?.id} — {selectedEvent?.type}</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{selectedEvent.zone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Value</span><span>{selectedEvent.value}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><StatusBadge status={selectedEvent.severity === "High" ? "high" : "medium"} label={selectedEvent.severity} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Claims Generated</span><span>{selectedEvent.claims}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{selectedEvent.date}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminEvents;
