import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuthStore } from "@/stores/adminAuthStore";
import { useToast } from "@/hooks/use-toast";

interface Props {
  children: React.ReactNode;
}

export function RequireSuperAdmin({ children }: Props) {
  const { role } = useAdminAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (role !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "You don't have access to that page.",
        variant: "destructive",
      });
      navigate("/admin/dashboard", { replace: true });
    }
  }, [role, navigate, toast]);

  if (role !== "super_admin") return null;
  return <>{children}</>;
}
