import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Download } from "lucide-react";
import { useState } from "react";

const policies = [
  { id: "POL-0847", worker: "Ramesh K.", platform: "Swiggy", plan: "Standard", premium: "₹35", status: "active" as const, autoRenew: true, start: "24 Feb", end: "2 Mar" },
  { id: "POL-0846", worker: "Priya S.", platform: "Zomato", plan: "Premium", premium: "₹59", status: "active" as const, autoRenew: false, start: "24 Feb", end: "2 Mar" },
  { id: "POL-0845", worker: "Arjun M.", platform: "Amazon", plan: "Basic", premium: "₹19", status: "expired" as const, autoRenew: true, start: "17 Feb", end: "23 Feb" },
];

const AdminPolicies = () => {
  const [selected, setSelected] = useState<typeof policies[0] | null>(null);

  return (
    <AdminLayout>
      <PageHeader title="Policies Management" description="View and manage all worker policies">
        <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select>
        <Select><SelectTrigger className="w-36"><SelectValue placeholder="Platform" /></SelectTrigger><SelectContent><SelectItem value="swiggy">Swiggy</SelectItem><SelectItem value="zomato">Zomato</SelectItem></SelectContent></Select>
        <Popover><PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="h-4 w-4 mr-2" /> Date Range</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="range" /></PopoverContent></Popover>
        <Button variant="outline">Apply</Button>
        <Button variant="ghost">Reset</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy ID</TableHead><TableHead>Worker</TableHead><TableHead>Platform</TableHead><TableHead>Plan</TableHead><TableHead>Premium</TableHead><TableHead>Status</TableHead><TableHead>Auto-Renew</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.id}</TableCell>
                  <TableCell>{p.worker}</TableCell>
                  <TableCell><Badge variant="secondary">{p.platform}</Badge></TableCell>
                  <TableCell>{p.plan}</TableCell>
                  <TableCell>{p.premium}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell><Switch checked={p.autoRenew} /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setSelected(p)}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Policy {selected?.id}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {[["Worker", selected.worker], ["Platform", selected.platform], ["Plan", selected.plan], ["Premium", selected.premium], ["Period", `${selected.start} – ${selected.end}`]].map(([k, v]) => (
                <div key={k as string}><div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{v}</span></div><Separator className="mt-2" /></div>
              ))}
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPolicies;
