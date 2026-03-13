import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { adminDataApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ClaimData {
  id: string;
  claim_number?: string;
  worker_name?: string;
  worker_id?: string;
  type: string;
  amount: number;
  fraud_score: number;
  status: string;
  zone_name?: string;
  created_at?: string;
  gps_match?: boolean;
  velocity?: number;
}

const AdminClaims = () => {
  const { token } = useAdminAuthStore();
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [selected, setSelected] = useState<ClaimData | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadClaims = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { limit: "50" };
        if (tab !== "all") params.status = tab;
        const res = await adminDataApi.getClaims(token, params);
        setClaims((res.data || []) as unknown as ClaimData[]);
      } catch (err) {
        console.error("Admin claims load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadClaims();
  }, [token, tab]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const handleApprove = async (claimId: string) => {
    if (!token) return;
    try {
      await adminDataApi.approveClaim(claimId, token);
      setClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, status: "approved" } : c));
      toast({ title: "Claim approved" });
      setSelected(null);
    } catch (err) { console.error(err); }
  };

  const handleReject = async (claimId: string) => {
    if (!token) return;
    try {
      await adminDataApi.rejectClaim(claimId, rejectReason, token);
      setClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, status: "rejected" } : c));
      toast({ title: "Claim rejected", variant: "destructive" });
      setSelected(null);
      setRejectReason("");
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <PageHeader title="Claims Management" description="Review and process worker claims">
        <Button disabled={checked.length === 0}>Approve Selected ({checked.length})</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : claims.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No claims found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fraud</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        checked={checked.includes(c.id)}
                        onCheckedChange={(v) => setChecked(v ? [...checked, c.id] : checked.filter(id => id !== c.id))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.claim_number || c.id.slice(0, 8)}</TableCell>
                    <TableCell>{c.worker_name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
                    <TableCell>₹{Number(c.amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <div className="w-20">
                        <Progress
                          value={c.fraud_score || 0}
                          className={`h-2 ${(c.fraud_score || 0) > 60 ? '[&>div]:bg-destructive' : (c.fraud_score || 0) > 30 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={c.status as "approved" | "pending" | "rejected"} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(c)}>Review</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setRejectReason(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{selected?.claim_number || selected?.id?.slice(0, 8)}</DialogTitle>
            <DialogDescription>Review claim details and fraud analysis</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {(selected.fraud_score || 0) > 60 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>High fraud score detected. Manual review recommended.</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Worker</span><p>{selected.worker_name || "—"}</p></div>
                <div><span className="text-muted-foreground">Type</span><p>{selected.type}</p></div>
                <div><span className="text-muted-foreground">Amount</span><p>₹{Number(selected.amount).toLocaleString("en-IN")}</p></div>
                <div><span className="text-muted-foreground">Fraud Score</span><p>{selected.fraud_score || 0}%</p></div>
                <div><span className="text-muted-foreground">Date</span><p>{formatDate(selected.created_at)}</p></div>
                <div><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status as "approved" | "pending" | "rejected"} /></div>
              </div>
              <Textarea
                placeholder="Rejection reason (optional)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              {selected.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApprove(selected.id)}>
                    Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => handleReject(selected.id)}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminClaims;
