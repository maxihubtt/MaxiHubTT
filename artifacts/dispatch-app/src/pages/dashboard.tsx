import { useQuery } from "@tanstack/react-query";
import { useListJobs, useGetJobStats } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { JobCard } from "@/components/job-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, Clock, ListOrdered, TrendingUp, Users, DollarSign } from "lucide-react";
import { JobStatus } from "@workspace/api-client-react";

interface AnalyticsData {
  days: { date: string; count: number; revenue: number }[];
  totalRevenue: number;
  topDrivers: { name: string; jobs: number }[];
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/jobs/analytics", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json() as Promise<AnalyticsData>;
}

export default function Dashboard() {
  const { data: jobs, isLoading: isJobsLoading } = useListJobs();
  const { data: stats, isLoading: isStatsLoading } = useGetJobStats();
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 30_000,
    retry: false,
  });

  const sortedJobs = jobs ? [...jobs].sort((a, b) => {
    if (a.status === JobStatus.pending && b.status !== JobStatus.pending) return -1;
    if (a.status !== JobStatus.pending && b.status === JobStatus.pending) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  const maxDayCount = analytics ? Math.max(...analytics.days.map(d => d.count), 1) : 1;

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

        {/* Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Jobs last 7 days bar chart */}
          <Card className="col-span-1 md:col-span-2 p-5 bg-muted/20">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Jobs — Last 7 Days</p>
            </div>
            {isAnalyticsLoading ? (
              <div className="flex items-end gap-2 h-24">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded" style={{ height: `${30 + Math.random() * 60}%` }} />
                ))}
              </div>
            ) : (
              <div className="flex items-end gap-1.5 h-24">
                {analytics?.days.map(d => {
                  const pct = maxDayCount === 0 ? 0 : Math.round((d.count / maxDayCount) * 100);
                  const label = new Date(d.date + "T12:00:00").toLocaleDateString("en-TT", { weekday: "short" });
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="relative w-full flex flex-col items-center">
                        {d.count > 0 && (
                          <span className="hidden group-hover:block text-[9px] text-muted-foreground font-mono mb-0.5">{d.count}</span>
                        )}
                        <div
                          className="w-full rounded-t transition-all"
                          style={{
                            height: `${Math.max(pct, d.count > 0 ? 8 : 2)}px`,
                            maxHeight: "80px",
                            background: pct > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))",
                            opacity: pct > 0 ? 1 : 0.3,
                          }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground font-mono">{label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Revenue */}
          <Card className="p-5 bg-muted/20 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Revenue</p>
            </div>
            {isAnalyticsLoading ? (
              <Skeleton className="h-10 w-28" />
            ) : (
              <div>
                <p className="text-3xl font-mono font-bold text-foreground">
                  TT${analytics?.totalRevenue.toLocaleString() ?? "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">from completed jobs</p>
              </div>
            )}
          </Card>
        </div>

        {/* Top Drivers */}
        {!isAnalyticsLoading && analytics && analytics.topDrivers.length > 0 && (
          <Card className="p-5 bg-muted/20">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Top Drivers</p>
            </div>
            <div className="space-y-2">
              {analytics.topDrivers.map((driver, i) => {
                const pct = Math.round((driver.jobs / (analytics.topDrivers[0]?.jobs ?? 1)) * 100);
                return (
                  <div key={driver.name} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm font-semibold text-foreground w-28 shrink-0 truncate">{driver.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-right shrink-0">{driver.jobs} jobs</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

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
  highlight,
}: {
  title: string;
  value?: number;
  loading: boolean;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-4 ${highlight ? "border-orange-500/50 bg-orange-500/5" : "bg-muted/20"}`}>
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">{title}</p>
        {icon}
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-3xl font-mono font-bold ${highlight ? "text-orange-500" : "text-foreground"}`}>
            {value ?? 0}
          </p>
        )}
      </div>
    </Card>
  );
}
