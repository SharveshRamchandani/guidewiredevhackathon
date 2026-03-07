import { useState } from "react";
import { WorkerLayout } from "@/components/WorkerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { IndianRupee, Receipt, Pencil, Check, X } from "lucide-react";

const payouts = [
  { id: "PAY-001", date: "1 Mar 2026", amount: "₹450", claim: "CLM-001", status: "completed" as const, upi: "ramesh@upi" },
  { id: "PAY-002", date: "22 Feb 2026", amount: "₹720", claim: "CLM-004", status: "completed" as const, upi: "ramesh@upi" },
  { id: "PAY-003", date: "15 Feb 2026", amount: "₹320", claim: "CLM-002", status: "pending" as const, upi: "ramesh@upi" },
];

const Payouts = () => {
  const [selectedPayout, setSelectedPayout] = useState<typeof payouts[0] | null>(null);
  const [editingUpi, setEditingUpi] = useState(false);
  const [upi, setUpi] = useState("ramesh@upi");
  const [tempUpi, setTempUpi] = useState(upi);

  return (
    <WorkerLayout>
      <div>
        <PageHeader title="Payouts" description="Track your payout history" />

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><IndianRupee className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold font-display">₹1,170</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center"><IndianRupee className="h-6 w-6 text-success" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Lifetime</p>
                <p className="text-2xl font-bold font-display">₹8,450</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Table */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Claim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.id}</TableCell>
                    <TableCell>{p.date}</TableCell>
                    <TableCell>{p.amount}</TableCell>
                    <TableCell>{p.claim}</TableCell>
                    <TableCell><StatusBadge status={p.status === "completed" ? "approved" : "pending"} label={p.status === "completed" ? "Completed" : "Pending"} /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedPayout(p)}><Receipt className="h-4 w-4 mr-1" /> View Receipt</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* UPI Update */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">UPI Account</p>
                {editingUpi ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input value={tempUpi} onChange={(e) => setTempUpi(e.target.value)} className="w-60" />
                    <Button variant="ghost" size="icon" onClick={() => { setUpi(tempUpi); setEditingUpi(false); }}><Check className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setTempUpi(upi); setEditingUpi(false); }}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm mt-1">{upi}</p>
                )}
              </div>
              {!editingUpi && <Button variant="outline" size="sm" onClick={() => setEditingUpi(true)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>}
            </div>
          </CardContent>
        </Card>

        {/* Payout Detail Modal */}
        <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Payout Receipt</DialogTitle></DialogHeader>
            {selectedPayout && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Payout ID</span><span>{selectedPayout.id}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{selectedPayout.date}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{selectedPayout.amount}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Claim Reference</span><span>{selectedPayout.claim}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">UPI</span><span>{selectedPayout.upi}</span></div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </WorkerLayout>
  );
};

export default Payouts;
