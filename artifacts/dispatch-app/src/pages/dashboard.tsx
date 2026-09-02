import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListJobs, useGetJobStats, getListJobsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { JobCard } from "@/components/job-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, CheckCircle2, Clock, ListOrdered, TrendingUp, Users, DollarSign,
  ChevronDown, ChevronRight, Search, Download, CalendarDays, Wifi, WifiOff,
} from "lucide-react";
import { JobStatus } from "@workspace/api-client-react";

interface AnalyticsData {
  days: { date: string; count: number; revenue: number }[];
  totalRevenue: number;
  topDrivers: { name: string; jobs: number }[];
}

interface DriverAccount {
  id: string;
  name: string;
  availability: string;
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/jobs/analytics", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json() as Promise<AnalyticsData>;
}

async function fetchDrivers(): Promise<DriverAccount[]> {
  const res = await fetch("/api/admin/drivers", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load drivers");
  return res.json() as Promise<DriverAccount[]>;
}

function playNewJobAlert() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    // Two-note ding
    [0, 0.18].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = i === 0 ? 880 : 1100;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.4, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);
      osc.start(now + delay);
      osc.stop(now + delay + 0.6);
    });
  } catch {}
}

const ACTIVE_STATUSES = new Set([
  JobStatus.pending, "pending_deposit", "deposit_received",
  "driver_assigned", "driver_en_route", JobStatus.claimed,
]);
const DONE_STATUSES = new Set(["completed", "cancelled", "expired"]);

export default function Dashboard() {
  const { data: jobs, isLoading: isJobsLoading } = useListJobs({
    query: { queryKey: getListJobsQueryKey(), refetchInterval: 10_000 },
  });
  const { data: stats, isLoading: isStatsLoading } = useGetJobStats();
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 30_000,
    retry: false,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: fetchDrivers,
    refetchInterval: 30_000,
    retry: false,
  });

  const [showDone, setShowDone] = useState(false);
  const [tab, setTab] = useState<"all" | "today">("all");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // New booking audio alert
  const prevActiveCount = useRef<number | null>(null);
  useEffect(() => {
    if (!jobs) return;
    const activeCount = jobs.filter(j => ACTIVE_STATUSES.has(j.status)).length;
    if (prevActiveCount.current !== null && activeCount > prevActiveCount.current) {
      playNewJobAlert();
    }
    prevActiveCount.current = activeCount;
  }, [jobs]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const allFiltered = jobs
    ? [...jobs].filter(j => {
        if (filterStatus !== "all" && j.status !== filterStatus) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const ext = j as typeof j & { name?: string; phone?: string };
          return (
            j.pickup.toLowerCase().includes(q) ||
            j.dropoff.toLowerCase().includes(q) ||
            j.id.toLowerCase().includes(q) ||
            (ext.name ?? "").toLowerCase().includes(q) ||
            (ext.phone ?? "").toLowerCase().includes(q)
          );
        }
        return true;
      })
    : [];

  const activeJobs = allFiltered
    .filter(j => ACTIVE_STATUSES.has(j.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const doneJobs = allFiltered
    .filter(j => DONE_STATUSES.has(j.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const todayJobs = jobs
    ? [...jobs]
        .filter(j => {
          const ext = j as typeof j & { pickupDatetime?: string | null };
          return ext.pickupDatetime?.slice(0, 10) === todayStr;
        })
        .sort((a, b) => {
          const ea = a as typeof a & { pickupDatetime?: string | null };
          const eb = b as typeof b & { pickupDatetime?: string | null };
          return new Date(ea.pickupDatetime ?? a.createdAt).getTime() -
                 new Date(eb.pickupDatetime ?? b.createdAt).getTime();
        })
    : [];

  const onlineDrivers = drivers.filter(d => d.availability === "online");
  const offlineDrivers = drivers.filter(d => d.availability !== "online");
  const maxDayCount = analytics ? Math.max(...analytics.days.map(d => d.count), 1) : 1;

  function handleExport() {
    window.open("/api/jobs/export", "_blank");
  }

  return (
    <Layout>
      <div className="space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Jobs" value={stats?.total} loading={isStatsLoading}
            icon={<ListOrdered className="h-4 w-4 text-muted-foreground" />} />
          <StatCard
            title="Awaiting Deposit"
            value={(stats as (typeof stats & { pendingDeposit?: number }) | undefined)?.pendingDeposit}
            loading={isStatsLoading}
            icon={<Activity className="h-4 w-4 text-yellow-500" />}
            highlight={((stats as (typeof stats & { pendingDeposit?: number }) | undefined)?.pendingDeposit ?? 0) > 0}
            color="yellow"
          />
          <StatCard
            title="Deposit Received"
            value={(stats as (typeof stats & { depositReceived?: number }) | undefined)?.depositReceived}
            loading={isStatsLoading}
            icon={<Activity className="h-4 w-4 text-emerald-500" />}
            highlight={((stats as (typeof stats & { depositReceived?: number }) | undefined)?.depositReceived ?? 0) > 0}
            color="emerald"
          />
          <StatCard title="Pending (Admin)" value={stats?.pending} loading={isStatsLoading}
            icon={<Activity className="h-4 w-4 text-orange-500" />}
            highlight={stats?.pending ? stats.pending > 0 : false}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Claimed" value={stats?.claimed} loading={isStatsLoading}
            icon={<Clock className="h-4 w-4 text-primary" />} />
          <StatCard title="Completed" value={stats?.completed} loading={isStatsLoading}
            icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
          <StatCard
            title="Expired"
            value={(stats as (typeof stats & { expired?: number }) | undefined)?.expired}
            loading={isStatsLoading}
            icon={<Clock className="h-4 w-4 text-red-400" />}
          />
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div className="w-full rounded-t transition-all"
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

          <Card className="p-5 bg-muted/20 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Revenue</p>
            </div>
            {isAnalyticsLoading ? <Skeleton className="h-10 w-28" /> : (
              <div>
                <p className="text-3xl font-mono font-bold text-foreground">
                  TT${analytics?.totalRevenue.toLocaleString() ?? "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">from completed jobs</p>
              </div>
            )}
          </Card>
        </div>

        {/* Driver Availability Panel */}
        {drivers.length > 0 && (
          <Card className="p-5 bg-muted/20">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Driver Availability</p>
              <span className="ml-auto text-xs font-mono text-muted-foreground">
                {onlineDrivers.length} online / {offlineDrivers.length} offline
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {drivers.map(d => (
                <div key={d.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  d.availability === "online"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}>
                  {d.availability === "online"
                    ? <Wifi className="h-3 w-3 text-emerald-600" />
                    : <WifiOff className="h-3 w-3" />}
                  {d.name}
                </div>
              ))}
            </div>
          </Card>
        )}

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
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-right shrink-0">{driver.jobs} jobs</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Jobs Section */}
        <div className="space-y-4">

          {/* Tabs + search + export */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg">
              <button
                onClick={() => setTab("all")}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all ${
                  tab === "all" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Live Dispatch
              </button>
              <button
                onClick={() => setTab("today")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-md transition-all ${
                  tab === "today" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="h-3 w-3" />
                Today's Runs
                {todayJobs.length > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0 text-[10px]">
                    {todayJobs.length}
                  </span>
                )}
              </button>
            </div>

            {tab === "all" && (
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search jobs…"
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-border bg-background text-xs font-mono text-muted-foreground focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="pending_deposit">Awaiting Deposit</option>
                  <option value="deposit_received">Deposit Received</option>
                  <option value="claimed">Claimed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {tab === "all" && (
                <div className="flex items-center gap-2 text-sm text-primary font-mono animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  LIVE
                </div>
              )}
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
            </div>
          </div>

          {/* Today's Runs tab */}
          {tab === "today" && (
            <div className="flex flex-col gap-3">
              {isJobsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
              ) : todayJobs.length === 0 ? (
                <div className="py-12 text-center border border-dashed rounded-lg bg-muted/10">
                  <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-mono">No runs scheduled for today.</p>
                </div>
              ) : (
                todayJobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />)
              )}
            </div>
          )}

          {/* Live dispatch tab */}
          {tab === "all" && (
            <>
              <div className="flex flex-col gap-3">
                {isJobsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
                ) : activeJobs.length === 0 ? (
                  <div className="py-12 text-center border border-dashed rounded-lg bg-muted/10">
                    <p className="text-muted-foreground font-mono">
                      {search || filterStatus !== "all" ? "No jobs match your filter." : "No active jobs."}
                    </p>
                  </div>
                ) : (
                  activeJobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />)
                )}
              </div>

              {!isJobsLoading && doneJobs.length > 0 && (
                <div className="space-y-3 mt-2">
                  <button
                    onClick={() => setShowDone(v => !v)}
                    className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showDone ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Completed / Cancelled ({doneJobs.length})
                  </button>
                  {showDone && (
                    <div className="flex flex-col gap-3">
                      {doneJobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </Layout>
  );
}

function StatCard({
  title, value, loading, icon, highlight, color = "orange",
}: {
  title: string;
  value?: number;
  loading: boolean;
  icon: React.ReactNode;
  highlight?: boolean;
  color?: "orange" | "yellow" | "emerald";
}) {
  const colorMap = {
    orange:  { border: "border-orange-500/50",  bg: "bg-orange-500/5",  text: "text-orange-500" },
    yellow:  { border: "border-yellow-500/50",  bg: "bg-yellow-500/5",  text: "text-yellow-600" },
    emerald: { border: "border-emerald-500/50", bg: "bg-emerald-500/5", text: "text-emerald-600" },
  };
  const c = colorMap[color];
  return (
    <Card className={`p-4 ${highlight ? `${c.border} ${c.bg}` : "bg-muted/20"}`}>
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">{title}</p>
        {icon}
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-3xl font-mono font-bold ${highlight ? c.text : "text-foreground"}`}>
            {value ?? 0}
          </p>
        )}
      </div>
    </Card>
  );
}
