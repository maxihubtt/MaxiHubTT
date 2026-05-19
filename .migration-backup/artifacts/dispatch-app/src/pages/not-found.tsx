import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-6">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h1 className="text-4xl font-mono font-bold tracking-tight mb-2 uppercase">404 - Signal Lost</h1>
        <p className="text-muted-foreground font-mono mb-8 max-w-md">
          The requested dispatch route could not be found. Please check your coordinates and try again.
        </p>
        <Link href="/">
          <Button size="lg" className="font-bold uppercase tracking-wider">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to HQ
          </Button>
        </Link>
      </div>
    </Layout>
  );
}
