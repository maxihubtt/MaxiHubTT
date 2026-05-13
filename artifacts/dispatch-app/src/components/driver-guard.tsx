import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export interface DriverSession {
  authenticated: boolean;
  name: string;
}

async function fetchDriverAuth(): Promise<DriverSession> {
  const res = await fetch("/api/auth/driver-me", { credentials: "include" });
  if (res.status === 401) return { authenticated: false, name: "" };
  if (!res.ok) throw new Error("Auth check failed");
  return res.json() as Promise<DriverSession>;
}

export function useDriverAuth() {
  return useQuery({
    queryKey: ["driver-auth"],
    queryFn: fetchDriverAuth,
    retry: false,
    staleTime: 60_000,
  });
}

interface DriverGuardProps {
  children: React.ReactNode;
}

export function DriverGuard({ children }: DriverGuardProps) {
  const { data, isLoading } = useDriverAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !data?.authenticated) {
      navigate("/driver/login");
    }
  }, [isLoading, data?.authenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f3d2e]">
        <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!data?.authenticated) return null;

  return <>{children}</>;
}
