import { useState } from "react";
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
import { Search } from "lucide-react";

const workers = [
  { id: "W-001", name: "Ramesh Kumar", phone: "9876543210", platform: "Swiggy", zone: "Bandra", city: "Mumbai", kyc: "verified" as const, risk: "low" as const, earnings: "₹5,000", policies: 12, claims: 7 },
  { id: "W-002", name: "Priya Sharma", phone: "9876543211", platform: "Zomato", zone: "Rohini", city: "Delhi", kyc: "verified" as const, risk: "medium" as const, earnings: "₹4,200", policies: 8, claims: 3 },
  { id: "W-003", name: "Arjun Mehta", phone: "9876543212", platform: "Amazon", zone: "Whitefield", city: "Bangalore", kyc: "pending" as const, risk: "high" as const, earnings: "₹6,100", policies: 15, claims: 11 },
];

const AdminWorkers = () => {
  const [selected, setSelected] = useState<typeof workers[0] | null>(null);
  const [search, setSearch] = useState("");

  const filtered = workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader title="Workers Management" description="View and manage registered workers" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search workers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select><SelectTrigger className="w-40"><SelectValue placeholder="Platform" /></SelectTrigger><SelectContent><SelectItem value="swiggy">Swiggy</SelectItem><SelectItem value="zomato">Zomato</SelectItem><SelectItem value="amazon">Amazon</SelectItem></SelectContent></Select>
        <Select><SelectTrigger className="w-40"><SelectValue placeholder="Zone" /></SelectTrigger><SelectContent><SelectItem value="bandra">Bandra</SelectItem><SelectItem value="rohini">Rohini</SelectItem><SelectItem value="whitefield">Whitefield</SelectItem></SelectContent></Select>
        <Button><Search className="h-4 w-4 mr-1" /> Search</Button>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Platform</TableHead><TableHead>Zone</TableHead><TableHead>KYC</TableHead><TableHead>Risk</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {filtered.map((w) => (
            <TableRow key={w.id}>
              <TableCell className="font-medium">{w.id}</TableCell>
              <TableCell>{w.name}</TableCell>
              <TableCell><Badge variant="secondary">{w.platform}</Badge></TableCell>
              <TableCell>{w.zone}</TableCell>
              <TableCell><StatusBadge status={w.kyc} /></TableCell>
              <TableCell><StatusBadge status={w.risk} /></TableCell>
              <TableCell><Button variant="ghost" size="sm" onClick={() => setSelected(w)}>View</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle className="font-display">{selected?.name}</SheetTitle></SheetHeader>
          {selected && (
            <ScrollArea className="h-[calc(100vh-100px)] mt-4">
              <Tabs defaultValue="profile">
                <TabsList className="w-full"><TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger><TabsTrigger value="policies" className="flex-1">Policies</TabsTrigger><TabsTrigger value="claims" className="flex-1">Claims</TabsTrigger><TabsTrigger value="fraud" className="flex-1">Fraud</TabsTrigger></TabsList>
                <TabsContent value="profile" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">ID</span><p>{selected.id}</p></div>
                    <div><span className="text-muted-foreground">Phone</span><p>{selected.phone}</p></div>
                    <div><span className="text-muted-foreground">Platform</span><p>{selected.platform}</p></div>
                    <div><span className="text-muted-foreground">Zone</span><p>{selected.zone}, {selected.city}</p></div>
                    <div><span className="text-muted-foreground">Earnings</span><p>{selected.earnings}/week</p></div>
                    <div><span className="text-muted-foreground">KYC</span><StatusBadge status={selected.kyc} /></div>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Textarea placeholder="Add note when flagging..." />
                    <Button variant="destructive" size="sm">Flag Worker</Button>
                  </div>
                </TabsContent>
                <TabsContent value="policies" className="mt-4"><p className="text-sm text-muted-foreground">{selected.policies} policies found.</p></TabsContent>
                <TabsContent value="claims" className="mt-4"><p className="text-sm text-muted-foreground">{selected.claims} claims found.</p></TabsContent>
                <TabsContent value="fraud" className="mt-4"><StatusBadge status={selected.risk} className="mb-2" /><p className="text-sm text-muted-foreground">Risk assessment details.</p></TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminWorkers;
