import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
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
import { AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fraudQueue = [
  { id: "CLM-1846", worker: "Arjun M.", zone: "Whitefield", type: "Poor AQI", score: 67, gpsMismatch: true, velocity: "3 claims/day" },
  { id: "CLM-1840", worker: "Suresh K.", zone: "Rohini", type: "Heavy Rain", score: 82, gpsMismatch: true, velocity: "5 claims/day" },
  { id: "CLM-1838", worker: "Meera P.", zone: "Bandra", type: "Heatwave", score: 55, gpsMismatch: false, velocity: "1 claim/day" },
];

const trendData = [
  { day: "Mon", score: 32 }, { day: "Tue", score: 28 }, { day: "Wed", score: 45 }, { day: "Thu", score: 67 }, { day: "Fri", score: 42 }, { day: "Sat", score: 38 }, { day: "Sun", score: 55 },
];

const AdminFraud = () => {
  const [selected, setSelected] = useState<typeof fraudQueue[0] | null>(null);

  return (
    <AdminLayout>
      <PageHeader title="Fraud Review Queue" description="Review flagged claims requiring manual inspection" />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Claim ID</TableHead><TableHead>Worker</TableHead><TableHead>Zone</TableHead><TableHead>Type</TableHead><TableHead>Fraud Score</TableHead><TableHead>Band</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {fraudQueue.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.id}</TableCell>
                  <TableCell>{f.worker}</TableCell>
                  <TableCell>{f.zone}</TableCell>
                  <TableCell><Badge variant="secondary">{f.type}</Badge></TableCell>
                  <TableCell><div className="w-20"><Progress value={f.score} className={`h-2 ${f.score > 60 ? '[&>div]:bg-destructive' : f.score > 30 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`} /></div></TableCell>
                  <TableCell><StatusBadge status={f.score > 60 ? "high" : f.score > 30 ? "medium" : "low"} /></TableCell>
                  <TableCell><Button size="sm" onClick={() => setSelected(f)}>Review</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="font-display text-lg">Fraud Score Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" /><YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="hsl(0 84.2% 60.2%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle className="font-display">{selected?.id} — Fraud Review</SheetTitle></SheetHeader>
          {selected && (
            <ScrollArea className="h-[calc(100vh-120px)] mt-4">
              <Tabs defaultValue="gps">
                <TabsList className="w-full">
                  <TabsTrigger value="gps" className="flex-1">GPS</TabsTrigger>
                  <TabsTrigger value="velocity" className="flex-1">Velocity</TabsTrigger>
                  <TabsTrigger value="platform" className="flex-1">Platform</TabsTrigger>
                  <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                </TabsList>
                <TabsContent value="gps" className="mt-4 space-y-3">
                  {selected.gpsMismatch && (
                    <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>GPS location mismatch detected. Worker was not in the claimed zone.</AlertDescription></Alert>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">GPS Match</span><StatusBadge status={selected.gpsMismatch ? "high" : "low"} label={selected.gpsMismatch ? "Mismatch" : "Match"} /></div>
                    <Progress value={selected.gpsMismatch ? 85 : 15} className="h-2" />
                  </div>
                </TabsContent>
                <TabsContent value="velocity" className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Claim Velocity</span><span>{selected.velocity}</span></div>
                  <Progress value={selected.score} className="h-2" />
                </TabsContent>
                <TabsContent value="platform" className="mt-4"><p className="text-sm text-muted-foreground">Platform activity data for {selected.worker}.</p></TabsContent>
                <TabsContent value="summary" className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Overall Score</span><span className="font-semibold">{selected.score}%</span></div>
                  <Progress value={selected.score} className={`h-2 ${selected.score > 60 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`} />
                </TabsContent>
              </Tabs>

              <div className="mt-6 space-y-3">
                <Textarea placeholder="Rejection reason..." />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground">Approve</Button>
                  <ConfirmationDialog
                    trigger={<Button variant="destructive" className="flex-1">Reject</Button>}
                    title="Reject Claim?"
                    description="This will reject the claim and notify the worker."
                    actionLabel="Reject"
                    variant="destructive"
                    onConfirm={() => setSelected(null)}
                  />
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default AdminFraud;
