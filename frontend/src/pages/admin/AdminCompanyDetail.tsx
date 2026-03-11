import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ArrowLeft, Search, Users, FileText, AlertTriangle, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const companyData: Record<string, any> = {
  "comp-001": { name: "SwiftCover Insurance", email: "admin@swiftcover.in", regCode: "SWFT2026", createdAt: "2025-11-15", createdBy: "Super Admin", status: "active", setupComplete: true },
  "comp-002": { name: "RideGuard Micro", email: "ops@rideguard.co", regCode: "RDGD2026", createdAt: "2025-12-01", createdBy: "Super Admin", status: "active", setupComplete: true },
  "comp-003": { name: "GigSafe Partners", email: "hello@gigsafe.in", regCode: "GSAF2026", createdAt: "2026-01-10", createdBy: "Super Admin", status: "inactive", setupComplete: false },
  "comp-004": { name: "UrbanShield Ltd", email: "admin@urbanshield.com", regCode: "URBS2026", createdAt: "2025-10-22", createdBy: "Super Admin", status: "active", setupComplete: true },
  "comp-005": { name: "FleetProtect India", email: "team@fleetprotect.in", regCode: "FLPT2026", createdAt: "2026-02-05", createdBy: "Super Admin", status: "active", setupComplete: true },
};

const statCards = [
  { label: "Total Workers", value: 342, icon: Users },
  { label: "Active Policies", value: 289, icon: FileText },
  { label: "Claims This Month", value: 47, icon: AlertTriangle },
  { label: "Loss Ratio", value: "16.3%", icon: TrendingDown },
];

const workers = [
  { name: "Ravi Kumar", phone: "+91 98765 43210", platform: "Zomato", zone: "Mumbai Central", riskScore: 12, activePolicy: true, lastLogin: "2 hrs ago" },
  { name: "Priya Sharma", phone: "+91 87654 32109", platform: "Swiggy", zone: "Andheri", riskScore: 45, activePolicy: true, lastLogin: "5 hrs ago" },
  { name: "Amit Patel", phone: "+91 76543 21098", platform: "Zepto", zone: "Bandra", riskScore: 78, activePolicy: false, lastLogin: "2 days ago" },
  { name: "Sunita Devi", phone: "+91 65432 10987", platform: "Zomato", zone: "Dadar", riskScore: 8, activePolicy: true, lastLogin: "1 hr ago" },
];

const claimsChart = [
  { week: "W1", claims: 12 }, { week: "W2", claims: 8 }, { week: "W3", claims: 15 },
  { week: "W4", claims: 11 }, { week: "W5", claims: 18 }, { week: "W6", claims: 9 },
  { week: "W7", claims: 14 }, { week: "W8", claims: 13 },
];

const auditLog = [
  { action: "Worker Flagged", timestamp: "2026-03-08 14:32", by: "Admin" },
  { action: "Policy Created", timestamp: "2026-03-07 09:15", by: "System" },
  { action: "Claim Approved", timestamp: "2026-03-06 16:48", by: "Admin" },
  { action: "Settings Updated", timestamp: "2026-03-05 11:22", by: "Admin" },
  { action: "Worker KYC Verified", timestamp: "2026-03-04 13:05", by: "System" },
];

const AdminCompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workerSearch, setWorkerSearch] = useState("");

  const company = companyData[id || ""] || companyData["comp-001"];
  const filteredWorkers = workers.filter((w) => w.name.toLowerCase().includes(workerSearch.toLowerCase()));

  return (
    <>
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/companies")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Companies
          </Button>
        </div>
        <PageHeader title={company.name} description="Company detail and management" />

        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-display">{company.name}</h2>
                  <Badge variant={company.status === "active" ? "default" : "destructive"} className={company.status === "active" ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}>
                    {company.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{company.email}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground mt-2">
                  <span>Code: <code className="bg-muted px-1 rounded">{company.regCode}</code></span>
                  <span>Created: {company.createdAt}</span>
                  <span>By: {company.createdBy}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {!company.setupComplete && (
                  <Button variant="outline" onClick={() => toast({ title: "Setup link resent", description: `Email sent to ${company.email}` })}>Resend Setup Link</Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Deactivate Company</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deactivate {company.name}?</AlertDialogTitle>
                      <AlertDialogDescription>This will prevent new worker registrations. Existing workers and policies won't be affected.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => toast({ title: "Company deactivated" })}>Deactivate</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <s.icon className="h-4 w-4" /> {s.label}
                </div>
                <p className="text-2xl font-bold font-display">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Workers Table */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Workers</CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search workers…" value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="hidden lg:table-cell">Zone</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="hidden md:table-cell">Policy</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((w) => (
                  <TableRow key={w.name}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{w.phone}</TableCell>
                    <TableCell>{w.platform}</TableCell>
                    <TableCell className="hidden lg:table-cell">{w.zone}</TableCell>
                    <TableCell>
                      <Badge variant={w.riskScore < 30 ? "secondary" : w.riskScore < 60 ? "outline" : "destructive"}>
                        {w.riskScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={w.activePolicy ? "default" : "outline"} className={w.activePolicy ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}>
                        {w.activePolicy ? "Active" : "None"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{w.lastLogin}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Claims Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Claims (Last 8 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ claims: { label: "Claims", color: "hsl(var(--primary))" } }} className="h-[250px] w-full">
              <BarChart data={claimsChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="claims" fill="var(--color-claims)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[240px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="outline">{entry.action}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{entry.timestamp}</TableCell>
                      <TableCell>{entry.by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
    </>
  );
};

export default AdminCompanyDetail;
