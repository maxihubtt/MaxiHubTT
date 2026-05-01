import { useRoute, Link } from "wouter";
import { useGetJob, getGetJobQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatRelativeTime, formatTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, User, Phone, DollarSign, Clock, Hash, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatus } from "@workspace/api-client-react";

export default function JobDetails() {
  const [, params] = useRoute("/jobs/:id");
  const id = params?.id || "";

  const { data: job, isLoading, isError } = useGetJob(id, {
    query: { enabled: !!id, queryKey: getGetJobQueryKey(id) }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (isError || !job) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground font-mono mb-6">Could not locate job record {id}</p>
          <Link href="/admin">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Feed</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        
        <div className="mb-6 flex items-center justify-between">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="font-mono text-muted-foreground uppercase text-xs">
              <ArrowLeft className="mr-2 h-3 w-3" /> Back
            </Button>
          </Link>
          <JobStatusBadge status={job.status} />
        </div>

        <Card className="overflow-hidden border-border/50">
          {/* Header */}
          <div className="bg-muted/30 border-b border-border/50 p-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Hash className="h-4 w-4" />
                <span className="font-mono text-sm tracking-wider uppercase">Job Record</span>
              </div>
              <h1 className="text-3xl font-mono font-bold tracking-tight">{job.id.slice(0, 8)}...</h1>
            </div>
            
            <div className="text-left md:text-right">
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Payout</p>
              <p className="text-4xl font-mono font-bold text-primary flex items-center md:justify-end">
                <DollarSign className="h-8 w-8" />
                {job.price}
              </p>
            </div>
          </div>

          {/* Route details */}
          <div className="p-6 border-b border-border/50">
            <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">Route Info</h3>
            <div className="relative pl-6 space-y-6">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
              
              <div className="relative">
                <div className="absolute -left-[29px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
                <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Pickup</p>
                <p className="text-lg font-medium">{job.pickup}</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[29px] top-1 h-4 w-4 rounded-full bg-orange-500 ring-4 ring-background" />
                <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Dropoff</p>
                <p className="text-lg font-medium">{job.dropoff}</p>
              </div>
            </div>
          </div>

          {/* Grid info */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
            <div className="p-6 space-y-4">
              <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Customer Details</h3>
              
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-md"><User className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-sm font-medium">{job.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-md"><Phone className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-sm font-mono">{job.phone}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-muted/10">
              <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Dispatch Status</h3>
              
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatTime(job.createdAt)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last Update</span>
                  <span>{formatRelativeTime(job.updatedAt)}</span>
                </div>

                {job.claimedBy && (
                  <div className="pt-3 mt-3 border-t border-border/50 flex justify-between items-center text-primary">
                    <span className="uppercase text-xs tracking-wider">Claimed By</span>
                    <span className="font-bold">{job.claimedBy}</span>
                  </div>
                )}
                
                {job.status === JobStatus.completed && (
                  <div className="pt-3 mt-3 border-t border-border/50 flex justify-between items-center text-muted-foreground">
                    <span className="uppercase text-xs tracking-wider flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Completed</span>
                    <span className="font-bold">Closed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </Card>
      </div>
    </Layout>
  );
}
