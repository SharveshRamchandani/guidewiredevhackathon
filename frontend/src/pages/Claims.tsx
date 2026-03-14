import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FileX, Loader2 } from "lucide-react";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { claimsApi } from "@/lib/api";

interface ClaimData {
  id: string;
  claim_number?: string;
  type: string;
  event_type?: string;
  amount: number;
  status: "approved" | "pending" | "rejected";
  fraud_score?: number;
  created_at: string;
  zone_name?: string;
}

const Claims = () => {
  const { token } = useWorkerAuthStore();
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimData | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadClaims = async () => {
      setLoading(true);
      try {
        const res = await claimsApi.getMyClaims(token);
        setClaims((res.data || []) as unknown as ClaimData[]);
      } catch (err) {
        console.error("Claims load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadClaims();
  }, [token]);

  const formatDate = (iso: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const filtered = tab === "all" ? claims : claims.filter((c) => c.status === tab);

  if (loading) {
    return (
      <div>
        <PageHeader title="Claims" description="Track your disruption claims and payouts" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Claims" description="Track your disruption claims and payouts" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({claims.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm"><CalendarIcon className="h-4 w-4 mr-2" /> Date Range</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="range" /></PopoverContent>
        </Popover>
      </div>

      {/* Claims */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileX className="h-12 w-12" />} title="No claims found" description="No claims match the selected filter." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{c.claim_number || c.id.slice(0, 8)}</span>
                  <StatusBadge status={c.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">{c.type}</Badge>
                  <span className="text-sm text-muted-foreground">{formatDate(c.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-display">₹{Number(c.amount).toLocaleString("en-IN")}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedClaim(c)}>View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Claim Detail Drawer */}
      <Sheet open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="font-display">{selectedClaim?.claim_number || selectedClaim?.id?.slice(0, 8)}</SheetTitle>
            <SheetDescription>Claim details and fraud analysis</SheetDescription>
          </SheetHeader>
          {selectedClaim && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={selectedClaim.status} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Disruption Type</span>
                <Badge variant="secondary">{selectedClaim.type || selectedClaim.event_type}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm">{formatDate(selectedClaim.created_at)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-semibold">₹{Number(selectedClaim.amount).toLocaleString("en-IN")}</span>
              </div>
              {selectedClaim.zone_name && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Zone</span>
                    <span className="text-sm">{selectedClaim.zone_name}</span>
                  </div>
                </>
              )}
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fraud Score</span>
                  <Badge variant="outline">
                    {(selectedClaim.fraud_score ?? 0) < 30 ? "Low" : (selectedClaim.fraud_score ?? 0) < 60 ? "Medium" : "High"}
                  </Badge>
                </div>
                <Progress value={selectedClaim.fraud_score ?? 0} className="h-2" />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Claims;
