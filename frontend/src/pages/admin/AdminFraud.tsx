import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { adminDataApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FraudClaim {
  id: string;
  claim_number?: string;
  worker_name?: string;
  worker_id?: string;
  type: string;
  amount: number;
  fraud_score: number;
  status: string;
  zone_name?: string;
  gps_match?: boolean;
  velocity?: number;
  created_at?: string;
}

const AdminFraud = () => {
  const { token } = useAdminAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fraudQueue, setFraudQueue] = useState<FraudClaim[]>([]);
  const [selected, setSelected] = useState<FraudClaim | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadFraudClaims = async () => {
      setLoading(true);
      try {
        // Fetch claims and filter for high fraud scores (>30)
        const res = await adminDataApi.getClaims(token, { limit: "50" });
        const all = (res.data || []) as unknown as FraudClaim[];
        const fraudClaims = all.filter((c) => (c.fraud_score || 0) > 30);
        setFraudQueue(fraudClaims);
      } catch (err) {
        console.error("Fraud queue load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFraudClaims();
  }, [token]);

  const handleApprove = async (claimId: string) => {
    if (!token) return;
    try {
      await adminDataApi.approveClaim(claimId, token);
      setFraudQueue((prev) => prev.filter((c) => c.id !== claimId));
      toast({ title: "Claim approved after review" });
      setSelected(null);
    } catch (err) { console.error(err); }
  };

  const handleReject = async (claimId: string) => {
    if (!token) return;
    try {
      await adminDataApi.rejectClaim(claimId, rejectReason, token);
      setFraudQueue((prev) => prev.filter((c) => c.id !== claimId));
      toast({ title: "Claim rejected", variant: "destructive" });
      setSelected(null);
      setRejectReason("");
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <PageHeader title="Fraud Review Queue" description={`${fraudQueue.length} flagged claims requiring manual inspection`} />

      <Card className="mb-6">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : fraudQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No flagged claims. All clear! ✅</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fraud Score</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fraudQueue.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.claim_number || f.id.slice(0, 8)}</TableCell>
                    <TableCell>{f.worker_name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{f.type}</Badge></TableCell>
                    <TableCell>₹{Number(f.amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <div className="w-20">
                        <Progress
                          value={f.fraud_score || 0}
                          className={`h-2 ${(f.fraud_score || 0) > 60 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={(f.fraud_score || 0) > 60 ? "high" : "medium"} /></TableCell>
                    <TableCell><Button size="sm" onClick={() => setSelected(f)}>Review</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => { setSelected(null); setRejectReason(""); }}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle className="font-display">{selected?.claim_number || selected?.id?.slice(0, 8)} — Fraud Review</SheetTitle></SheetHeader>
          {selected && (
            <ScrollArea className="h-[calc(100vh-120px)] mt-4">
              <Tabs defaultValue="summary">
                <TabsList className="w-full">
                  <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="mt-4 space-y-3">
                  {(selected.fraud_score || 0) > 60 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>High fraud score ({selected.fraud_score}%). Manual review required.</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Worker</span><p>{selected.worker_name || "—"}</p></div>
                    <div><span className="text-muted-foreground">Type</span><p>{selected.type}</p></div>
                    <div><span className="text-muted-foreground">Amount</span><p>₹{Number(selected.amount).toLocaleString("en-IN")}</p></div>
                    <div><span className="text-muted-foreground">Fraud Score</span><p>{selected.fraud_score || 0}%</p></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Overall Score</span><span className="font-semibold">{selected.fraud_score || 0}%</span></div>
                    <Progress
                      value={selected.fraud_score || 0}
                      className={`h-2 ${(selected.fraud_score || 0) > 60 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">GPS Match</span>
                    <StatusBadge status={selected.gps_match ? "low" : "high"} label={selected.gps_match ? "Match" : "Mismatch"} />
                  </div>
                  {selected.velocity !== undefined && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Velocity</span><span>{selected.velocity} claims/day</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                    <StatusBadge status={selected.status as "approved" | "pending" | "rejected"} />
                  </div>
                </TabsContent>
              </Tabs>

              {selected.status === "pending" && (
                <div className="mt-6 space-y-3">
                  <Textarea
                    placeholder="Rejection reason..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApprove(selected.id)}>
                      Approve
                    </Button>
                    <ConfirmationDialog
                      trigger={<Button variant="destructive" className="flex-1">Reject</Button>}
                      title="Reject Claim?"
                      description="This will reject the claim and notify the worker."
                      actionLabel="Reject"
                      variant="destructive"
                      onConfirm={() => handleReject(selected.id)}
                    />
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminFraud;
