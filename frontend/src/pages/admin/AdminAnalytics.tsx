import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { adminDataApi } from "@/lib/api";

interface AnalyticsData {
  claims_by_type: Array<{ type: string; count: number; total_amount: number }>;
  claims_by_status: Array<{ status: string; count: number }>;
  revenue_by_month: Array<{ month: string; premium: number }>;
  fraud_distribution: { low: number; medium: number; high: number };
  payouts_by_status: Array<{ status: string; count: number; total: number }>;
}

const TYPE_COLORS: Record<string, string> = {
  "Heavy Rain": "hsl(221.2 83.2% 53.3%)",
  "Poor AQI": "hsl(173 58% 39%)",
  "Heatwave": "hsl(12 76% 61%)",
  "Platform Outage": "hsl(43 74% 66%)",
};

const AdminAnalytics = () => {
  const { token } = useAdminAuthStore();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const res = await adminDataApi.getAnalytics(token);
        setAnalytics(res.data as unknown as AnalyticsData);
      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [token]);

  if (loading) {
    return (
      <>
        <PageHeader title="Analytics" description="Platform insights and data analysis" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <PageHeader title="Analytics" description="Platform insights and data analysis" />
        <p className="text-sm text-muted-foreground text-center py-8">No analytics data available.</p>
      </>
    );
  }

  // Prepare chart data
  const pieData = (analytics.claims_by_type || []).map((c) => ({
    name: c.type,
    value: Number(c.count),
    color: TYPE_COLORS[c.type] || "hsl(200 50% 50%)",
  }));

  const revenueData = (analytics.revenue_by_month || []).reverse().map((r) => ({
    month: r.month,
    premium: Number(r.premium),
  }));

  const fraudDist = analytics.fraud_distribution || { low: 0, medium: 0, high: 0 };
  const fraudData = [
    { name: "Low (<30)", value: Number(fraudDist.low || 0), fill: "hsl(142 76% 36%)" },
    { name: "Medium (30-60)", value: Number(fraudDist.medium || 0), fill: "hsl(43 74% 66%)" },
    { name: "High (>60)", value: Number(fraudDist.high || 0), fill: "hsl(0 84.2% 60.2%)" },
  ];

  return (
    <>
      <PageHeader title="Analytics" description="Platform insights and data analysis">
        <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export PDF</Button>
      </PageHeader>

      {/* Claims by Type + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Claims by Disruption Type</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No claims data.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {pieData.map((d) => <Badge key={d.name} variant="outline" style={{ borderColor: d.color, color: d.color }}>{d.name}</Badge>)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Monthly Premium Revenue</CardTitle></CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No revenue data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                  <Bar dataKey="premium" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fraud Distribution + Claims Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Fraud Score Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fraudData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {fraudData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Claims by Status</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Status</TableHead><TableHead>Count</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(analytics.claims_by_status || []).map((s) => (
                  <TableRow key={s.status}>
                    <TableCell><StatusBadge status={s.status as "approved" | "pending" | "rejected"} /></TableCell>
                    <TableCell className="font-medium">{s.count}</TableCell>
                  </TableRow>
                ))}
                {(analytics.claims_by_status || []).length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Summary */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Payouts Summary</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Status</TableHead><TableHead>Count</TableHead><TableHead>Total Amount</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(analytics.payouts_by_status || []).map((p) => (
                <TableRow key={p.status}>
                  <TableCell className="capitalize">{p.status}</TableCell>
                  <TableCell>{p.count}</TableCell>
                  <TableCell>₹{Number(p.total || 0).toLocaleString("en-IN")}</TableCell>
                </TableRow>
              ))}
              {(analytics.payouts_by_status || []).length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No payouts data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export default AdminAnalytics;
