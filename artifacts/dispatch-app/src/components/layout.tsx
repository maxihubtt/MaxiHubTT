import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Zap, LayoutDashboard, Plus, Clock, LogOut, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.invalidateQueries({ queryKey: ["admin-auth"] });
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Zap className="h-5 w-5 fill-current" />
              </div>
              <span className="font-bold text-lg tracking-tight uppercase">Maxi Hub Dispatch</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 ${
                  location === "/admin" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Live Feed
              </Link>
              <Link
                href="/admin/drivers"
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 ${
                  location === "/admin/drivers" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Drivers
              </Link>
              <Link
                href="/admin/config"
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 ${
                  location === "/admin/config" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Settings className="h-4 w-4" />
                Config
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground text-xs font-mono bg-muted/50 px-3 py-1.5 rounded-md border border-border">
              <Clock className="h-3.5 w-3.5" />
              <span>{time}</span>
            </div>

            <Link href="/admin/new-job">
              <Button size="sm" className="font-bold uppercase tracking-wider">
                <Plus className="mr-2 h-4 w-4" />
                New Job
              </Button>
            </Link>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
