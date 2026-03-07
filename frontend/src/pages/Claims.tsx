import { useState } from "react";
import { WorkerLayout } from "@/components/WorkerLayout";
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
import { CalendarIcon, FileX } from "lucide-react";

const claimsData = [
  { id: "CLM-001", date: "28 Feb 2026", type: "Heavy Rain", amount: "₹450", status: "approved" as const, fraudScore: 12, zone: "Bandra" },
  { id: "CLM-002", date: "25 Feb 2026", type: "Poor AQI", amount: "₹320", status: "pending" as const, fraudScore: 8, zone: "Bandra" },
  { id: "CLM-003", date: "20 Feb 2026", type: "Platform Outage", amount: "₹280", status: "rejected" as const, fraudScore: 65, zone: "Bandra" },
  { id: "CLM-004", date: "15 Feb 2026", type: "Heatwave", amount: "₹400", status: "approved" as const, fraudScore: 5, zone: "Bandra" },
];

const Claims = () => {
  const [tab, setTab] = useState("all");
  const [selectedClaim, setSelectedClaim] = useState<typeof claimsData[0] | null>(null);

  const filtered = tab === "all" ? claimsData : claimsData.filter((c) => c.status === tab);

  return (
    <WorkerLayout>
      <div>
        <PageHeader title="Claims" description="Track your disruption claims and payouts" />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
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
        {filtered.length === 0 ? (
          <EmptyState icon={<FileX className="h-12 w-12" />} title="No claims found" description="No claims match the selected filter." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.id}</span>
                    <StatusBadge status={c.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">{c.type}</Badge>
                    <span className="text-sm text-muted-foreground">{c.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold font-display">{c.amount}</span>
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
              <SheetTitle className="font-display">{selectedClaim?.id}</SheetTitle>
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
                  <Badge variant="secondary">{selectedClaim.type}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm">{selectedClaim.date}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm font-semibold">{selectedClaim.amount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Zone</span>
                  <span className="text-sm">{selectedClaim.zone}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fraud Score</span>
                    <Badge variant="outline">{selectedClaim.fraudScore < 30 ? "Low" : selectedClaim.fraudScore < 60 ? "Medium" : "High"}</Badge>
                  </div>
                  <Progress value={selectedClaim.fraudScore} className="h-2" />
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </WorkerLayout>
  );
};

export default Claims;
