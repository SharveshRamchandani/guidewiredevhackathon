import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, MoreHorizontal, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const companies = [
  { id: "comp-001", name: "SwiftCover Insurance", email: "admin@swiftcover.in", regCode: "SWFT2026", workers: 342, activePolicies: 289, claimsThisMonth: 47, status: "active" as const },
  { id: "comp-002", name: "RideGuard Micro", email: "ops@rideguard.co", regCode: "RDGD2026", workers: 198, activePolicies: 156, claimsThisMonth: 23, status: "active" as const },
  { id: "comp-003", name: "GigSafe Partners", email: "hello@gigsafe.in", regCode: "GSAF2026", workers: 87, activePolicies: 0, claimsThisMonth: 0, status: "inactive" as const },
  { id: "comp-004", name: "UrbanShield Ltd", email: "admin@urbanshield.com", regCode: "URBS2026", workers: 521, activePolicies: 478, claimsThisMonth: 62, status: "active" as const },
  { id: "comp-005", name: "FleetProtect India", email: "team@fleetprotect.in", regCode: "FLPT2026", workers: 145, activePolicies: 132, claimsThisMonth: 18, status: "active" as const },
];

const AdminCompanies = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = companies.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = companies.filter((c) => c.status === "active").length;

  return (
    <>
        <PageHeader title="All Companies" description="Manage insurance companies on the platform">
          <Badge variant="secondary" className="text-sm">{activeCount} Active</Badge>
          <Button onClick={() => navigate("/admin/companies/new")}>
            <Building2 className="h-4 w-4 mr-1" /> Create New Company
          </Button>
        </PageHeader>

        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by company name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead className="hidden md:table-cell">Admin Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Reg Code</TableHead>
                  <TableHead className="text-right">Workers</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Active Policies</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Claims/Mo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.regCode}</code>
                        </TooltipTrigger>
                        <TooltipContent>Workers use this code to register under this company</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right">{c.workers}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{c.activePolicies}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{c.claimsThisMonth}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "destructive"} className={c.status === "active" ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}>
                        {c.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/companies/${c.id}`)}>View Details</DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">Deactivate Account</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate {c.name}?</AlertDialogTitle>
                                <AlertDialogDescription>Deactivating this company will prevent new worker registrations under their code. Existing workers and policies will not be affected.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => toast({ title: "Company deactivated", description: `${c.name} has been deactivated.` })}>Deactivate</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <DropdownMenuItem onClick={() => toast({ title: "Setup link reset", description: `A new setup link has been sent to ${c.email}` })}>Reset Setup Link</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No companies found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </>
  );
};

export default AdminCompanies;
