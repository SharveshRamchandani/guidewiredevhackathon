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
import { useEffect, useState } from "react";
import { useWorkerAuthStore } from "@/stores/workerAuthStore";
import { claimsApi } from "@/lib/api";

const Dashboard = () => {
  const { weather, loading, error } = useWeather();
  const daysRemaining = 5;
  const daysTotal = 7;
  const { token } = useWorkerAuthStore();
  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        if (!token) {
          setClaimsLoading(false);
          return;
        }
        const res = await claimsApi.getMyClaims(token);
        setClaims(res.data || []);
      } catch (err) {
        console.error("Failed to fetch claims", err);
      } finally {
        setClaimsLoading(false);
      }
    };
    fetchClaims();
  }, [token]);

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
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Active Policy
              </CardTitle>
              <StatusBadge status="active" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Policy ID</span><p className="font-medium">POL-2026-0847</p></div>
                <div><span className="text-muted-foreground">Plan</span><p className="font-medium">Standard Weekly</p></div>
                <div><span className="text-muted-foreground">Premium</span><p className="font-medium">₹35/week</p></div>
                <div><span className="text-muted-foreground">Max Coverage</span><p className="font-medium">₹2,000/week</p></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Days Remaining</span>
                  <span className="font-medium">{daysRemaining}/{daysTotal}</span>
                </div>
                <Progress value={(daysRemaining / daysTotal) * 100} />
              </div>
            </CardContent>
            <CardFooter>
              <Link to="/policy"><Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" /> View Policy Details</Button></Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" /> Weekly Protected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-display text-primary">₹4,850</p>
              <p className="text-sm text-muted-foreground mt-1">of ₹5,000 avg earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[
            { label: "Total Claims", value: "7", sub: "this month" },
            { label: "Total Payouts", value: "₹2,140", sub: "this month" },
            { label: "Approval Rate", value: "85.7%", sub: "lifetime" },
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
                {claimsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No recent claims
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.slice(0, 3).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.claim_number || c.id.slice(0, 8)}</TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                      <TableCell>{c.type || c.event_type}</TableCell>
                      <TableCell>₹{c.amount}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))
                )}
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
          <Alert className="border-primary/30 bg-primary/5">
            <Shield className="h-4 w-4 text-primary" />
            <AlertTitle>Policy Renewal</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your policy expires in 2 days. Renew now to stay protected.</p>
              <Button size="sm">Renew Now</Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
  );
};

export default Dashboard;
