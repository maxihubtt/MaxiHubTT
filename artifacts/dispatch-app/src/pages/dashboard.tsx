import { useListJobs, useGetJobStats } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { JobCard } from "@/components/job-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, Clock, ListOrdered } from "lucide-react";
import { JobStatus } from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: jobs, isLoading: isJobsLoading } = useListJobs();
  const { data: stats, isLoading: isStatsLoading } = useGetJobStats();

  const sortedJobs = jobs ? [...jobs].sort((a, b) => {
    // Sort pending first, then by date desc
    if (a.status === JobStatus.pending && b.status !== JobStatus.pending) return -1;
    if (a.status !== JobStatus.pending && b.status === JobStatus.pending) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total Jobs" 
            value={stats?.total} 
            loading={isStatsLoading}
            icon={<ListOrdered className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard 
            title="Pending" 
            value={stats?.pending} 
            loading={isStatsLoading}
            icon={<Activity className="h-4 w-4 text-orange-500" />}
            highlight={stats?.pending ? stats.pending > 0 : false}
          />
          <StatCard 
            title="Claimed" 
            value={stats?.claimed} 
            loading={isStatsLoading}
            icon={<Clock className="h-4 w-4 text-primary" />}
          />
          <StatCard 
            title="Completed" 
            value={stats?.completed} 
            loading={isStatsLoading}
            icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        {/* Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase tracking-tight">Live Dispatch Feed</h2>
            <div className="flex items-center gap-2 text-sm text-primary font-mono animate-pulse">
              <div className="h-2 w-2 rounded-full bg-primary" />
              LIVE
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {isJobsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))
            ) : sortedJobs.length === 0 ? (
              <div className="py-12 text-center border border-dashed rounded-lg bg-muted/10">
                <p className="text-muted-foreground font-mono">No active jobs.</p>
              </div>
            ) : (
              sortedJobs.map((job, index) => (
                <JobCard key={job.id} job={job} index={index} />
              ))
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}

function StatCard({ 
  title, 
  value, 
  loading, 
  icon, 
  highlight 
}: { 
  title: string; 
  value?: number; 
  loading: boolean; 
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-4 ${highlight ? 'border-orange-500/50 bg-orange-500/5' : 'bg-muted/20'}`}>
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">{title}</p>
        {icon}
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-3xl font-mono font-bold ${highlight ? 'text-orange-500' : 'text-foreground'}`}>
            {value ?? 0}
          </p>
        )}
      </div>
    </Card>
  );
}
