import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { adminDataApi } from "@/lib/api";

interface WorkerData {
  id: string;
  name: string;
  phone: string;
  platform?: string;
  zone_name?: string;
  city?: string;
  is_kyc_verified?: boolean;
  kyc_status?: string;
  risk_level?: string;
  risk_score?: number;
  avg_weekly_earning?: number;
  active?: boolean;
  created_at?: string;
}

const AdminWorkers = () => {
  const { token } = useAdminAuthStore();
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkerData | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!token) return;

    const loadWorkers = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { limit: "50" };
        if (platformFilter && platformFilter !== "all") params.platform = platformFilter;
        const res = await adminDataApi.getWorkers(token, params);
        const data = res.data;
        setWorkers((data?.workers || []) as unknown as WorkerData[]);
        setTotal(data?.total || 0);
      } catch (err) {
        console.error("Workers load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadWorkers();
  }, [token, platformFilter]);

  const filtered = workers.filter(
    (w) =>
      (w.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (w.phone || "").includes(search) ||
      (w.id || "").toLowerCase().includes(search.toLowerCase())
  );

  const getKycStatus = (w: WorkerData) => {
    if (w.is_kyc_verified === true || w.kyc_status === "verified") return "verified" as const;
    return "pending" as const;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      <PageHeader title="Workers Management" description={`${total} registered workers`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search workers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="Swiggy">Swiggy</SelectItem>
            <SelectItem value="Zomato">Zomato</SelectItem>
            <SelectItem value="Amazon">Amazon</SelectItem>
            <SelectItem value="Zepto">Zepto</SelectItem>
            <SelectItem value="Blinkit">Blinkit</SelectItem>
            <SelectItem value="Dunzo">Dunzo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No workers found.</TableCell>
              </TableRow>
            ) : (
              filtered.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name || "—"}</TableCell>
                  <TableCell>{w.phone}</TableCell>
                  <TableCell>{w.platform ? <Badge variant="secondary">{w.platform}</Badge> : "—"}</TableCell>
                  <TableCell>{w.zone_name || "—"}</TableCell>
                  <TableCell><StatusBadge status={getKycStatus(w)} /></TableCell>
                  <TableCell><StatusBadge status={(w.risk_level as "low" | "medium" | "high") || "low"} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(w.created_at)}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setSelected(w)}>View</Button></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle className="font-display">{selected?.name}</SheetTitle></SheetHeader>
          {selected && (
            <ScrollArea className="h-[calc(100vh-100px)] mt-4">
              <Tabs defaultValue="profile">
                <TabsList className="w-full">
                  <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">ID</span><p className="truncate">{selected.id}</p></div>
                    <div><span className="text-muted-foreground">Phone</span><p>{selected.phone}</p></div>
                    <div><span className="text-muted-foreground">Platform</span><p>{selected.platform || "—"}</p></div>
                    <div><span className="text-muted-foreground">Zone</span><p>{selected.zone_name || "—"}{selected.city ? `, ${selected.city}` : ""}</p></div>
                    <div><span className="text-muted-foreground">Earnings</span><p>₹{Number(selected.avg_weekly_earning || 0).toLocaleString("en-IN")}/week</p></div>
                    <div><span className="text-muted-foreground">KYC</span><StatusBadge status={getKycStatus(selected)} /></div>
                    <div><span className="text-muted-foreground">Status</span><Badge variant={selected.active !== false ? "outline" : "destructive"}>{selected.active !== false ? "Active" : "Inactive"}</Badge></div>
                    <div><span className="text-muted-foreground">Risk</span><StatusBadge status={(selected.risk_level as "low" | "medium" | "high") || "low"} /></div>
                  </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4 text-sm text-muted-foreground">
                  <p>Joined: {formatDate(selected.created_at)}</p>
                  {selected.risk_score !== undefined && <p className="mt-2">Risk Score: {selected.risk_score}</p>}
                </TabsContent>
                <TabsContent value="actions" className="mt-4">
                  <div className="space-y-2">
                    <Textarea placeholder="Add note when flagging..." />
                    <Button variant="destructive" size="sm">Flag Worker</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminWorkers;
