import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { RequireSuperAdmin } from "@/components/RequireSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Building2, Users, FileText, IndianRupee, TrendingDown, ShieldCheck } from "lucide-react";

const kpis = [
  { label: "Insurance Companies", value: 5, trend: "+2", icon: Building2 },
  { label: "Registered Workers", value: "1,293", trend: "+89", icon: Users },
  { label: "Active Policies", value: "1,055", trend: "+134", icon: FileText },
  { label: "Premiums This Week", value: "₹4,21,500", trend: "+12%", icon: IndianRupee },
  { label: "Payouts This Week", value: "₹68,400", trend: "-8%", icon: IndianRupee },
  { label: "Loss Ratio", value: "16.2%", trend: "-1.4%", icon: TrendingDown },
];

const revenueWeekly = [
  { period: "W1", premiums: 380000, payouts: 52000 }, { period: "W2", premiums: 395000, payouts: 61000 },
  { period: "W3", premiums: 410000, payouts: 45000 }, { period: "W4", premiums: 421500, payouts: 68400 },
];
const revenueMonthly = [
  { period: "Jan", premiums: 1200000, payouts: 180000 }, { period: "Feb", premiums: 1450000, payouts: 210000 },
  { period: "Mar", premiums: 1600000, payouts: 195000 },
];

const leaderboard = [
  { name: "UrbanShield Ltd", workers: 521, policies: 478, lossRatio: 12.8, health: "healthy" },
  { name: "SwiftCover Insurance", workers: 342, policies: 289, lossRatio: 16.3, health: "healthy" },
  { name: "RideGuard Micro", workers: 198, policies: 156, lossRatio: 22.1, health: "warning" },
  { name: "FleetProtect India", workers: 145, policies: 132, lossRatio: 18.5, health: "healthy" },
  { name: "GigSafe Partners", workers: 87, policies: 0, lossRatio: 0, health: "critical" },
];

const fraudData = [
  { week: "W1", rate: 3.2 }, { week: "W2", rate: 2.8 }, { week: "W3", rate: 4.1 },
  { week: "W4", rate: 3.5 }, { week: "W5", rate: 2.9 }, { week: "W6", rate: 3.8 },
];

const riskZones = [
  { zone: "Mumbai Central", claims: 23, level: "high" },
  { zone: "Andheri East", claims: 18, level: "high" },
  { zone: "Bandra West", claims: 14, level: "medium" },
  { zone: "Dadar", claims: 11, level: "medium" },
  { zone: "Thane", claims: 8, level: "low" },
];

const AdminPlatformStats = () => {
  const [revenuePeriod, setRevenuePeriod] = useState("weekly");
  const revenueData = revenuePeriod === "weekly" ? revenueWeekly : revenueMonthly;

  return (
    <RequireSuperAdmin>
      <AdminLayout>
        <PageHeader title="Platform Statistics" description="Bird's-eye view of the entire GigShield platform" />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                  <k.icon className="h-3.5 w-3.5" /> {k.label}
                </div>
                <p className="text-xl font-bold font-display">{k.value}</p>
                <Badge variant="outline" className="mt-1 text-xs">{k.trend} vs last week</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Revenue Overview</CardTitle>
              <Tabs value={revenuePeriod} onValueChange={setRevenuePeriod}>
                <TabsList className="h-8">
                  <TabsTrigger value="weekly" className="text-xs px-3">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs px-3">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ premiums: { label: "Premiums", color: "hsl(var(--primary))" }, payouts: { label: "Payouts", color: "hsl(var(--destructive))" } }} className="h-[280px] w-full">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="period" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="premiums" stroke="var(--color-premiums)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="payouts" stroke="var(--color-payouts)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Company Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Workers</TableHead>
                    <TableHead className="text-right">Policies</TableHead>
                    <TableHead className="text-right">Loss Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right">{c.workers}</TableCell>
                      <TableCell className="text-right">{c.policies}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.health === "healthy" ? "secondary" : c.health === "warning" ? "outline" : "destructive"} className={c.health === "healthy" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30" : c.health === "warning" ? "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30" : ""}>
                          {c.lossRatio}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Risk Zones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Risk Zones</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Claims/Week</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskZones.map((z) => (
                    <TableRow key={z.zone}>
                      <TableCell className="font-medium">{z.zone}</TableCell>
                      <TableCell className="text-right">{z.claims}</TableCell>
                      <TableCell>
                        <Badge variant={z.level === "high" ? "destructive" : z.level === "medium" ? "outline" : "secondary"} className={z.level === "medium" ? "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30" : ""}>
                          {z.level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Fraud Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Fraud Detection Rate (Weekly)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ rate: { label: "Detection %", color: "hsl(var(--warning))" } }} className="h-[220px] w-full">
              <BarChart data={fraudData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="rate" fill="var(--color-rate)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Disruption Heat Map placeholder */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Disruption Heat Map</CardTitle>
              <Select defaultValue="all">
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="flood">Flood</SelectItem>
                  <SelectItem value="rain">Heavy Rain</SelectItem>
                  <SelectItem value="heat">Heat Wave</SelectItem>
                  <SelectItem value="accident">Road Accident</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <ShieldCheck className="h-5 w-5 mr-2" /> Zone-level disruption map — integrates with mapping service
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    </RequireSuperAdmin>
  );
};

export default AdminPlatformStats;
