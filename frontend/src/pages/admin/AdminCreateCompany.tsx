/**
 * Admin Create Company Page
 * Route: /admin/companies/new
 * Super Admin only.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, Copy, CheckCheck, Building2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { superAdminApi, ApiError } from "@/lib/api";
import { useAdminAuthStore } from "@/stores/adminAuthStore";

type CreatedResult = {
  setupLink: string;
  registrationCode: string;
  admin: { name: string; email: string; companyName: string };
};

const AdminCreateCompany = () => {
  const navigate = useNavigate();
  const { token } = useAdminAuthStore();

  const [form, setForm] = useState({
    name: "",
    email: "",
    companyName: "",
    companyRegNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreatedResult | null>(null);
  const [copiedSetup, setCopiedSetup] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const copyToClipboard = async (text: string, type: 'setup' | 'code') => {
    await navigator.clipboard.writeText(text);
    if (type === 'setup') {
      setCopiedSetup(true);
      setTimeout(() => setCopiedSetup(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.companyName) {
      setError("Name, email, and company name are required.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await superAdminApi.createAdmin(
        {
          name: form.name,
          email: form.email,
          companyName: form.companyName,
          companyRegNumber: form.companyRegNumber || undefined,
        },
        token!
      );

      if (res.setupLink && res.registrationCode) {
        setResult({
          setupLink: res.setupLink,
          registrationCode: res.registrationCode,
          admin: res.admin!,
        });
      } else {
        toast.success("Admin account created. Setup email sent.");
        navigate("/admin/companies");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create admin. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold font-display">Create Insurance Company</h1>
          <p className="text-muted-foreground text-sm">Add a new insurance company to the platform</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            The admin will receive a setup link to create their password. Workers will use the registration code to link their accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Admin Name</Label>
                <Input
                  id="create-name"
                  placeholder="Rahul Sharma"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Admin Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="admin@company.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-company">Company / Insurance Provider Name</Label>
              <Input
                id="create-company"
                placeholder="Swift Insurance Pvt Ltd"
                value={form.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-reg">Company Registration Number (optional)</Label>
              <Input
                id="create-reg"
                placeholder="CIN or IRDA registration number"
                value={form.companyRegNumber}
                onChange={(e) => handleChange("companyRegNumber", e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/companies")}
              >
                Cancel
              </Button>
              <Button
                id="create-admin-btn"
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create Admin Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={!!result} onOpenChange={() => { }}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Admin Account Created!</DialogTitle>
            <DialogDescription className="text-center">
              Share these details with {result?.admin.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Registration Code */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Registration Code</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <code className="flex-1 text-lg font-mono font-bold tracking-widest text-primary">
                  {result?.registrationCode}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(result!.registrationCode, 'code')}
                >
                  {copiedCode ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with delivery workers who should be covered under{" "}
                <strong>{result?.admin.companyName}</strong>. Workers enter this during registration.
              </p>
            </div>

            {/* Setup Link */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Admin Setup Link</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <code className="flex-1 text-xs font-mono text-muted-foreground truncate">
                  {result?.setupLink}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(result!.setupLink, 'setup')}
                >
                  {copiedSetup ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with <strong>{result?.admin.email}</strong> to let them complete their account setup.
                Link expires in 48 hours.
              </p>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Important:</strong> Keep the setup link private. Anyone with this link can set the admin password.
                The registration code can be shared freely with delivery workers.
              </AlertDescription>
            </Alert>

            <Button className="w-full" onClick={() => navigate("/admin/companies")}>
              Done → View All Companies
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCreateCompany;
