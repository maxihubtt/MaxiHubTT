import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Zap, LayoutDashboard, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Zap className="h-5 w-5 fill-current" />
              </div>
              <span className="font-bold text-lg tracking-tight uppercase">MxiHub Dispatch</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/" 
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 ${
                  location === "/" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Live Feed
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground text-xs font-mono bg-muted/50 px-3 py-1.5 rounded-md border border-border">
              <Clock className="h-3.5 w-3.5" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            
            <Link href="/new-job">
              <Button size="sm" className="font-bold uppercase tracking-wider">
                <Plus className="mr-2 h-4 w-4" />
                New Job
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
