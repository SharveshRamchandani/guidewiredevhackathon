/**
 * Super Admin — Create Staff Member
 * Route: /admin/staff/new
 * Creates a new GigShield operations staff account.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Copy, CheckCircle2, AlertCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { superAdminApi, ApiError } from "@/lib/api";

const AdminCreateStaff = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { token } = useAdminAuthStore();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Success dialog state
    const [setupLink, setSetupLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            setError("Name and email are required.");
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const result = await superAdminApi.createStaff(
                { name: name.trim(), email: email.trim().toLowerCase(), jobTitle: jobTitle.trim() || undefined },
                token!
            );

            if (result.setupLink) {
                setSetupLink(result.setupLink);
            } else {
                toast({ title: "Staff account created", description: `Setup email sent to ${email}.` });
                navigate("/admin/staff");
            }
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.code === "EMAIL_ALREADY_EXISTS") {
                    setError("A staff member with this email already exists.");
                } else {
                    setError(err.message || "Failed to create staff account.");
                }
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (!setupLink) return;
        await navigator.clipboard.writeText(setupLink);
        setCopied(true);
        toast({ title: "Copied!", description: "Setup link copied to clipboard." });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDone = () => {
        setSetupLink(null);
        navigate("/admin/staff");
    };

    return (
        <>
                <PageHeader
                    title="Add Staff Member"
                    description="Create a new GigShield operations team account"
                />

                <div className="max-w-lg">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
                                New Staff Member
                            </CardTitle>
                            <CardDescription>
                                The staff member will receive a setup link to create their password.
                                The link expires in 24 hours.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="staff-name">Full Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="staff-name"
                                        placeholder="Priya Sharma"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={loading}
                                        autoComplete="name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="staff-email">Work Email <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="staff-email"
                                        type="email"
                                        placeholder="priya@gigshield.in"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="staff-jobtitle">Job Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        id="staff-jobtitle"
                                        placeholder="e.g. Claims Manager, Fraud Analyst"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate("/admin/staff")}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={loading}>
                                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Create Staff Account
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Success Dialog — shown in dev mode with setup link */}
                <Dialog open={!!setupLink} onOpenChange={(open) => !open && handleDone()}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                Staff Account Created
                            </DialogTitle>
                            <DialogDescription>
                                Share this setup link with the staff member to complete their account setup.
                                It expires in <strong>24 hours</strong>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                            <div className="bg-muted rounded-lg p-3 text-xs break-all font-mono">
                                {setupLink}
                            </div>
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleCopyLink}
                            >
                                {copied ? (
                                    <><CheckCircle2 className="h-4 w-4 text-green-500" /> Copied!</>
                                ) : (
                                    <><Copy className="h-4 w-4" /> Copy Setup Link</>
                                )}
                            </Button>
                        </div>

                        <Alert>
                            <AlertDescription className="text-xs">
                                In production, this link is sent automatically via email.
                                For now (dev mode), copy and send it manually.
                            </AlertDescription>
                        </Alert>

                        <DialogFooter>
                            <Button onClick={handleDone} className="w-full">Done</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
        </>
    );
};

export default AdminCreateStaff;
