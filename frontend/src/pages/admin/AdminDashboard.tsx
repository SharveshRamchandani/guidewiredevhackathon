import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, IndianRupee, FileText, ShieldAlert } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, FunnelChart, Funnel, LabelList } from "recharts";

const kpis = [
  { label: "Active Workers", value: "12,432", trend: "up", change: "+5.2%", icon: Users },
  { label: "Premium Collected", value: "₹4.35L", trend: "up", change: "+12%", icon: IndianRupee },
  { label: "Active Claims", value: "847", trend: "down", change: "-3.1%", icon: FileText },
  { label: "Fraud Flagged", value: "23", trend: "up", change: "+8%", icon: ShieldAlert },
];

const funnelData = [
  { name: "Triggered", value: 1200, fill: "hsl(221.2 83.2% 53.3%)" },
  { name: "Validated", value: 980, fill: "hsl(173 58% 39%)" },
  { name: "Approved", value: 847, fill: "hsl(142 76% 36%)" },
  { name: "Paid Out", value: 812, fill: "hsl(43 74% 66%)" },
];

const gaugeData = [{ name: "Loss Ratio", value: 42, fill: "hsl(142 76% 36%)" }];

const recentClaims = [
  { id: "CLM-1847", worker: "Priya S.", type: "Rain", zone: "Bandra", score: 12, status: "pending" as const },
  { id: "CLM-1846", worker: "Arjun M.", type: "AQI", zone: "Whitefield", score: 67, status: "pending" as const },
  { id: "CLM-1845", worker: "Vikram R.", type: "Outage", zone: "Dwarka", score: 8, status: "approved" as const },
];

const riskZones = [
  { zone: "Bandra", city: "Mumbai", claims: 142, risk: "high" as const },
  { zone: "Rohini", city: "Delhi", claims: 98, risk: "high" as const },
  { zone: "Koramangala", city: "Bangalore", claims: 34, risk: "low" as const },
];

const premiumData = [
  { week: "W1", amount: 95000 }, { week: "W2", amount: 102000 }, { week: "W3", amount: 110000 }, { week: "W4", amount: 108000 },
];

const AdminDashboard = () => {
  return (
    <>
      <PageHeader title="Admin Dashboard" description="Overview of GigShield operations" />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-display">{kpi.value}</p>
              <Badge variant="outline" className={`mt-1 ${kpi.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {kpi.change}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Claims Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Loss Ratio</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={gaugeData} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-8">
              <p className="text-3xl font-bold font-display">42%</p>
              <StatusBadge status="low" label="Healthy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Claims Queue */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="font-display text-lg">Recent Claims Queue</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Fraud Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentClaims.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.id}</TableCell>
                  <TableCell>{c.worker}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell>{c.zone}</TableCell>
                  <TableCell><StatusBadge status={c.score < 30 ? "low" : c.score < 60 ? "medium" : "high"} label={`${c.score}%`} /></TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-success h-7 px-2">Approve</Button>
                      <Button size="sm" variant="ghost" className="text-destructive h-7 px-2">Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Top Risk Zones</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Zone</TableHead><TableHead>City</TableHead><TableHead>Claims</TableHead><TableHead>Risk</TableHead></TableRow></TableHeader>
              <TableBody>
                {riskZones.map((z) => (
                  <TableRow key={z.zone}><TableCell>{z.zone}</TableCell><TableCell>{z.city}</TableCell><TableCell>{z.claims}</TableCell><TableCell><StatusBadge status={z.risk} /></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Premium Collected</CardTitle>
            <Tabs defaultValue="weekly"><TabsList><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList></Tabs>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={premiumData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="amount" fill="hsl(221.2 83.2% 53.3%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>  );
};

export default AdminDashboard;
