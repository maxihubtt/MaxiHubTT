import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";

async function fetchAuthStatus(): Promise<{ authenticated: boolean }> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return { authenticated: false };
  if (!res.ok) throw new Error("Auth check failed");
  return res.json() as Promise<{ authenticated: boolean }>;
}

export function useAdminAuth() {
  return useQuery({
    queryKey: ["admin-auth"],
    queryFn: fetchAuthStatus,
    retry: false,
    staleTime: 60_000,
  });
}

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data, isLoading } = useAdminAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !data?.authenticated) {
      navigate("/admin/login");
    }
  }, [isLoading, data?.authenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-primary text-primary-foreground p-3 rounded-xl animate-pulse">
            <Zap className="h-7 w-7 fill-current" />
          </div>
          <p className="text-sm text-muted-foreground font-mono">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!data?.authenticated) {
    return null;
  }

  return <>{children}</>;
}
