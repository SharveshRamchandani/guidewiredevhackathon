import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const premiumData = [
  { week: "W1", value: 95000 }, { week: "W2", value: 102000 }, { week: "W3", value: 110000 }, { week: "W4", value: 108000 }, { week: "W5", value: 115000 },
];

const pieData = [
  { name: "Rain", value: 42, color: "hsl(221.2 83.2% 53.3%)" },
  { name: "AQI", value: 28, color: "hsl(173 58% 39%)" },
  { name: "Heat", value: 18, color: "hsl(12 76% 61%)" },
  { name: "Outage", value: 12, color: "hsl(43 74% 66%)" },
];

const fraudData = [
  { week: "W1", caught: 5, missed: 1 }, { week: "W2", caught: 8, missed: 2 }, { week: "W3", caught: 12, missed: 1 }, { week: "W4", caught: 7, missed: 0 },
];

const riskData = [
  { zone: "Bandra", city: "Mumbai", risk: "critical" as const, probability: 87 },
  { zone: "Rohini", city: "Delhi", risk: "high" as const, probability: 72 },
  { zone: "Electronic City", city: "Bangalore", risk: "medium" as const, probability: 45 },
  { zone: "Koramangala", city: "Bangalore", risk: "low" as const, probability: 18 },
];

const AdminAnalytics = () => {
  return (
    <>
      <PageHeader title="Analytics" description="Platform insights and predictive risk analysis">
        <div className="flex gap-2">
          <Popover><PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="h-4 w-4 mr-2" /> Date Range</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="range" /></PopoverContent></Popover>
          <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export PDF</Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Weekly Premiums</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={premiumData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" /><YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(221.2 83.2% 53.3%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Claims by Disruption Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((d) => <Badge key={d.name} variant="outline" style={{ borderColor: d.color, color: d.color }}>{d.name}</Badge>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Fraud Detection</CardTitle>
            <Tabs defaultValue="weekly"><TabsList><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList></Tabs>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fraudData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" /><YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="caught" fill="hsl(142 76% 36%)" radius={[4,4,0,0]} />
                <Bar dataKey="missed" fill="hsl(0 84.2% 60.2%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Predictive Risk</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Zone</TableHead><TableHead>City</TableHead><TableHead>Risk</TableHead><TableHead>Probability</TableHead></TableRow></TableHeader>
              <TableBody>
                {riskData.map((r) => (
                  <TableRow key={r.zone}>
                    <TableCell className="font-medium">{r.zone}</TableCell>
                    <TableCell>{r.city}</TableCell>
                    <TableCell><StatusBadge status={r.risk} /></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={r.probability} className="h-2 w-20" /><span className="text-sm">{r.probability}%</span></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminAnalytics;
