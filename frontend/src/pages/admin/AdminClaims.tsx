import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, AlertTriangle } from "lucide-react";

const claims = [
  { id: "CLM-1847", worker: "Priya S.", type: "Heavy Rain", zone: "Bandra", date: "28 Feb", amount: "₹450", fraud: 12, status: "pending" as const },
  { id: "CLM-1846", worker: "Arjun M.", type: "Poor AQI", zone: "Whitefield", date: "27 Feb", amount: "₹320", fraud: 67, status: "pending" as const },
  { id: "CLM-1845", worker: "Vikram R.", type: "Outage", zone: "Dwarka", date: "26 Feb", amount: "₹280", fraud: 8, status: "approved" as const },
  { id: "CLM-1844", worker: "Meera P.", type: "Heatwave", zone: "Rohini", date: "25 Feb", amount: "₹400", fraud: 45, status: "rejected" as const },
];

const AdminClaims = () => {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<typeof claims[0] | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [fraudRange, setFraudRange] = useState([0]);

  const filtered = tab === "all" ? claims : claims.filter(c => c.status === tab);

  return (
    <>
      <PageHeader title="Claims Management" description="Review and process worker claims">
        <Button disabled={checked.length === 0}>Approve Selected ({checked.length})</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger></TabsList></Tabs>
        <Select><SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="rain">Rain</SelectItem><SelectItem value="aqi">AQI</SelectItem><SelectItem value="heat">Heat</SelectItem><SelectItem value="outage">Outage</SelectItem></SelectContent></Select>
        <Popover><PopoverTrigger asChild><Button variant="outline" size="sm"><CalendarIcon className="h-4 w-4 mr-1" /> Date</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="range" /></PopoverContent></Popover>
        <div className="w-40"><p className="text-xs text-muted-foreground mb-1">Fraud ≥ {fraudRange[0]}%</p><Slider value={fraudRange} onValueChange={setFraudRange} max={100} step={5} /></div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>ID</TableHead><TableHead>Worker</TableHead><TableHead>Type</TableHead><TableHead>Zone</TableHead><TableHead>Amount</TableHead><TableHead>Fraud</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><Checkbox checked={checked.includes(c.id)} onCheckedChange={(v) => setChecked(v ? [...checked, c.id] : checked.filter(id => id !== c.id))} /></TableCell>
                  <TableCell className="font-medium">{c.id}</TableCell>
                  <TableCell>{c.worker}</TableCell>
                  <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
                  <TableCell>{c.zone}</TableCell>
                  <TableCell>{c.amount}</TableCell>
                  <TableCell><div className="w-20"><Progress value={c.fraud} className={`h-2 ${c.fraud > 60 ? '[&>div]:bg-destructive' : c.fraud > 30 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`} /></div></TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(c)}>Review</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{selected?.id}</DialogTitle>
            <DialogDescription>Review claim details and fraud analysis</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Tabs defaultValue="summary">
                <TabsList className="w-full"><TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger><TabsTrigger value="gps" className="flex-1">GPS</TabsTrigger><TabsTrigger value="fraud" className="flex-1">Fraud</TabsTrigger><TabsTrigger value="platform" className="flex-1">Platform</TabsTrigger></TabsList>
                <div className="mt-4">
                  {selected.fraud > 60 && <Alert variant="destructive" className="mb-4"><AlertTriangle className="h-4 w-4" /><AlertDescription>High fraud score detected. Manual review recommended.</AlertDescription></Alert>}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Worker</span><p>{selected.worker}</p></div>
                    <div><span className="text-muted-foreground">Type</span><p>{selected.type}</p></div>
                    <div><span className="text-muted-foreground">Amount</span><p>{selected.amount}</p></div>
                    <div><span className="text-muted-foreground">Fraud Score</span><p>{selected.fraud}%</p></div>
                  </div>
                </div>
              </Tabs>
              <Textarea placeholder="Rejection reason (optional)..." />
              <div className="flex gap-2">
                <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground">Approve</Button>
                <Button variant="destructive" className="flex-1">Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminClaims;
