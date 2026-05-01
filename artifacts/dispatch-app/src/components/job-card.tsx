import { Job, JobStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MapPin, Navigation, DollarSign, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { JobStatusBadge } from "./job-status-badge";
import { formatCurrency, formatRelativeTime } from "@/lib/format";

interface JobCardProps {
  job: Job;
  index: number;
}

export function JobCard({ job, index }: JobCardProps) {
  const isPending = job.status === JobStatus.pending;
  
  return (
    <Link href={`/jobs/${job.id}`}>
      <Card 
        className={`group relative overflow-hidden border transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 cursor-pointer ${
          isPending ? 'border-border' : 'border-border/50 opacity-75 hover:opacity-100'
        } animate-in fade-in slide-in-from-bottom-4 fill-mode-both`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {isPending && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
        )}
        
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{job.id.slice(0, 8)}</span>
              <JobStatusBadge status={job.status} />
            </div>
            <div className="flex items-center text-primary font-mono font-bold text-lg">
              <DollarSign className="h-4 w-4" />
              {job.price}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="mt-0.5 flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="h-6 w-0.5 bg-border my-1" />
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Pickup</p>
                    <p className="text-sm font-medium leading-snug">{job.pickup}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Dropoff</p>
                    <p className="text-sm font-medium leading-snug">{job.dropoff}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between items-start md:items-end text-sm text-muted-foreground font-mono bg-muted/20 p-3 rounded-md">
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between w-full">
                  <span className="uppercase text-xs">Customer</span>
                  <span className="text-foreground">{job.name}</span>
                </div>
                {job.claimedBy && (
                  <div className="flex justify-between w-full text-primary">
                    <span className="uppercase text-xs">Driver</span>
                    <span>{job.claimedBy}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-xs">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(job.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
