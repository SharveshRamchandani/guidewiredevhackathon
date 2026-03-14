import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { IndianRupee, Receipt, Pencil, Check, X, Loader2 } from "lucide-react";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { workerApi } from "@/lib/api";

interface PayoutData {
  id: string;
  payout_number?: string;
  amount: number;
  status: string;
  claim_id?: string;
  claim_number?: string;
  upi?: string;
  initiated_at?: string;
  completed_at?: string;
}

const Payouts = () => {
  const { token } = useWorkerAuthStore();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<PayoutData | null>(null);
  const [editingUpi, setEditingUpi] = useState(false);
  const [upi, setUpi] = useState("");
  const [tempUpi, setTempUpi] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [payoutsRes, profileRes] = await Promise.all([
          workerApi.getMyPayouts(token).catch(() => ({ success: false, data: [] })),
          workerApi.getProfile(token).catch(() => ({ success: false, data: null })),
        ]);
        setPayouts((payoutsRes.data || []) as unknown as PayoutData[]);
        if (profileRes.data) {
          setProfile(profileRes.data);
          const workerUpi = (profileRes.data as Record<string, unknown>).upi as string || "";
          setUpi(workerUpi);
          setTempUpi(workerUpi);
        }
      } catch (err) {
        console.error("Payouts load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const completedPayouts = payouts.filter((p) => p.status === "completed");
  const totalCompleted = completedPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalAll = payouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  if (loading) {
    return (
      <div>
        <PageHeader title="Payouts" description="Track your payout history" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
      <div>
        <PageHeader title="Payouts" description="Track your payout history" />

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><IndianRupee className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold font-display">₹{totalAll.toLocaleString("en-IN")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center"><IndianRupee className="h-6 w-6 text-success" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold font-display">₹{totalCompleted.toLocaleString("en-IN")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Table */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payouts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payout ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.payout_number || p.id.slice(0, 8)}</TableCell>
                      <TableCell>{formatDate(p.initiated_at)}</TableCell>
                      <TableCell>₹{Number(p.amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={p.status === "completed" ? "approved" : p.status === "failed" ? "rejected" : "pending"}
                          label={p.status === "completed" ? "Completed" : p.status === "failed" ? "Failed" : "Pending"}
                        />
                      </TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedPayout(p)}><Receipt className="h-4 w-4 mr-1" /> View Receipt</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
                  <p className="text-muted-foreground text-sm mt-1">{upi || "Not set"}</p>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Payout ID</span><span>{selectedPayout.payout_number || selectedPayout.id.slice(0, 8)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(selectedPayout.initiated_at)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">₹{Number(selectedPayout.amount).toLocaleString("en-IN")}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{selectedPayout.status}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">UPI</span><span>{selectedPayout.upi || upi || "—"}</span></div>
                {selectedPayout.completed_at && (
                  <>
                    <Separator />
                    <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>{formatDate(selectedPayout.completed_at)}</span></div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default Payouts;
