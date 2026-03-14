import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { CloudRain, Thermometer, Wind, AlertTriangle, IndianRupee, Shield, Eye, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useWeather } from '@/hooks/useWeather';
import { Skeleton } from "@/components/ui/skeleton";

const recentClaims = [
  { id: "CLM-001", date: "28 Feb 2026", type: "Heavy Rain", amount: "₹450", status: "approved" as const },
  { id: "CLM-002", date: "25 Feb 2026", type: "Poor AQI", amount: "₹320", status: "pending" as const },
  { id: "CLM-003", date: "20 Feb 2026", type: "Platform Outage", amount: "₹280", status: "rejected" as const },
];

const Dashboard = () => {
  const { weather, loading, error } = useWeather();
  const daysRemaining = 5;
  const daysTotal = 7;

  return (
      <div>
        <PageHeader title="Dashboard" description="Welcome back, Ramesh!" />

        {/* Disruption Alert */}
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Live Disruption Alert <Badge variant="outline" className="bg-destructive/20 text-destructive-foreground border-destructive/40">Heavy Rain</Badge>
          </AlertTitle>
          <AlertDescription>
            {error ? "Weather data unavailable." : `Heavy rainfall detected in ${weather?.city || 'your'} zone. If disruption continues, a claim will be auto-triggered.`}
          </AlertDescription>
        </Alert>

        {/* Active Policy + Earnings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {activePolicy ? (
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Active Policy
                </CardTitle>
                <StatusBadge status="active" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Policy ID</span><p className="font-medium">{(activePolicy.policy_number as string) || "—"}</p></div>
                  <div><span className="text-muted-foreground">Plan</span><p className="font-medium capitalize">{(activePolicy.plan_name as string) || "—"}</p></div>
                  <div><span className="text-muted-foreground">Premium</span><p className="font-medium">₹{Number(activePolicy.premium || 0).toLocaleString("en-IN")}/week</p></div>
                  <div><span className="text-muted-foreground">Max Coverage</span><p className="font-medium">₹{Number(activePolicy.max_coverage || 0).toLocaleString("en-IN")}/week</p></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Days Remaining</span>
                    <span className="font-medium">{daysRemaining}/{daysTotal}</span>
                  </div>
                  <Progress value={daysTotal > 0 ? (daysRemaining / daysTotal) * 100 : 0} />
                </div>
              </CardContent>
              <CardFooter>
                <Link to="/policy"><Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" /> View Policy Details</Button></Link>
              </CardFooter>
            </Card>
          ) : (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" /> No Active Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">You don't have an active policy. Get protected now!</p>
                <Link to="/plans"><Button>Browse Plans</Button></Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" /> Weekly Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-display text-primary">
                ₹{Number(profile?.avg_weekly_earning || profile?.weekly_earnings || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">avg weekly earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[
            { label: "Total Claims", value: String(stats.totalClaims), sub: "all time" },
            { label: "Total Payouts", value: stats.totalPayouts, sub: "completed" },
            { label: "Approval Rate", value: stats.approvalRate, sub: "lifetime" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold font-display">{s.value}</p>
                <Separator className="my-2" />
                <p className="text-sm text-muted-foreground">{s.label} · {s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Claims */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentClaims.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.id}</TableCell>
                    <TableCell>{c.date}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>{c.amount}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Weather Widget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                {loading ? <Skeleton className="h-6 w-48" /> : `Live Weather — ${weather?.city || 'Detecting...'}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center p-4 text-destructive">
                  <p className="text-sm font-medium">Weather unavailable</p>
                  <p className="text-xs">{error}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <CloudRain className="h-8 w-8 mx-auto text-primary mb-1" />
                    <p className="text-lg font-bold">{weather ? `${weather.rainfall}mm` : '—'}</p>
                    <p className="text-xs text-muted-foreground">Rainfall</p>
                  </div>
                  <div>
                    <Thermometer className="h-8 w-8 mx-auto text-chart-1 mb-1" />
                    <p className="text-lg font-bold">{weather ? `${weather.temp.toFixed(1)}°C` : '—'}</p>
                    <p className="text-xs text-muted-foreground">Temperature</p>
                  </div>
                  <div>
                    <Wind className="h-8 w-8 mx-auto text-chart-2 mb-1" />
                    <p className="text-lg font-bold">{weather ? Math.round(weather.aqi * 40) : '—'}</p>
                    <p className="text-xs text-muted-foreground">AQI</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {weather?.aqiLabel || '—'}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Renew Banner */}
        {activePolicy && daysRemaining <= 2 && (
          <Alert className="border-primary/30 bg-primary/5 mb-6">
            <Shield className="h-4 w-4 text-primary" />
            <AlertTitle>Policy Renewal</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your policy expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. Renew now to stay protected.</p>
              <Button size="sm">Renew Now</Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
  );
};

export default Dashboard;
