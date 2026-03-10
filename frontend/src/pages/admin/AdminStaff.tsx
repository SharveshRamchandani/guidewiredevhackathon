/**
 * Super Admin — Staff Management
 * Route: /admin/staff
 * List, deactivate, and reactivate GigShield staff members.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { RequireSuperAdmin } from "@/components/RequireSuperAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MoreHorizontal, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { superAdminApi, ApiError } from "@/lib/api";

interface StaffMember {
    id: string;
    name: string;
    email: string;
    job_title: string | null;
    role: "admin" | "super_admin";
    active: boolean;
    last_login: string | null;
    created_at: string;
}

const AdminStaff = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { token } = useAdminAuthStore();

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);

    const loadStaff = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await superAdminApi.listStaff(token);
            setStaff(res.staff);
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: "Failed to load staff list." });
        } finally {
            setLoading(false);
        }
    }, [token, toast]);

    useEffect(() => { loadStaff(); }, [loadStaff]);

    const filtered = staff.filter((s) => {
        const matchSearch =
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase());
        const matchStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && s.active) ||
            (statusFilter === "inactive" && !s.active);
        return matchSearch && matchStatus;
    });

    const activeCount = staff.filter((s) => s.active).length;

    const handleDeactivate = async () => {
        if (!deactivateTarget || !token) return;
        try {
            await superAdminApi.deactivateStaff(deactivateTarget.id, token);
            toast({ title: "Staff deactivated", description: `${deactivateTarget.name} has been deactivated.` });
            setDeactivateTarget(null);
            loadStaff();
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : "Failed to deactivate staff.";
            toast({ variant: "destructive", title: "Error", description: msg });
            setDeactivateTarget(null);
        }
    };

    const handleReactivate = async (member: StaffMember) => {
        if (!token) return;
        try {
            await superAdminApi.reactivateStaff(member.id, token);
            toast({ title: "Staff reactivated", description: `${member.name} has been reactivated.` });
            loadStaff();
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : "Failed to reactivate staff.";
            toast({ variant: "destructive", title: "Error", description: msg });
        }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return "Never";
        return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    };

    return (
        <RequireSuperAdmin>
            <AdminLayout>
                <PageHeader title="Staff Management" description="Manage GigShield operations team members">
                    <Badge variant="secondary" className="text-sm">{activeCount} Active</Badge>
                    <Button onClick={() => navigate("/admin/staff/new")}>
                        <UserPlus className="h-4 w-4 mr-1" /> Add Staff Member
                    </Button>
                </PageHeader>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[160px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Staff Table */}
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Email</TableHead>
                                        <TableHead className="hidden lg:table-cell">Job Title</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden md:table-cell">Last Login</TableHead>
                                        <TableHead className="hidden lg:table-cell">Joined</TableHead>
                                        <TableHead className="w-12" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">{member.name}</TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">{member.email}</TableCell>
                                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                                                {member.job_title || <span className="text-muted-foreground/50">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={member.role === "super_admin" ? "default" : "secondary"}>
                                                    {member.role === "super_admin" ? "Super Admin" : "Admin"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={member.active ? "outline" : "destructive"}>
                                                    {member.active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                                {formatDate(member.last_login)}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                                                {formatDate(member.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {member.active ? (
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => setDeactivateTarget(member)}
                                                            >
                                                                Deactivate
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleReactivate(member)}>
                                                                Reactivate
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                No staff members found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Deactivate Confirmation Dialog */}
                <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This staff member will lose access to the GigShield admin portal immediately.
                                You can reactivate their account at any time.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive hover:bg-destructive/90">
                                Deactivate
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </AdminLayout>
        </RequireSuperAdmin>
    );
};

export default AdminStaff;
