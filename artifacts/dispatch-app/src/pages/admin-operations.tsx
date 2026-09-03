import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, CalendarDays, CheckCircle2, ChevronRight, CreditCard,
  DollarSign, ListChecks, Search, Users, AlertTriangle, Clock,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type OperationJob = {
  id: string;
  pickup: string;
  dropoff: string;
  name?: string;
  phone?: string;
  price: string;
  status: string;
  urgency?: string;
  passengers?: string | null;
  passengerCount?: number | null;
  numberBuses?: number;
  pickupDatetime?: string | null;
  depositAmount?: number | null;
  depositPaid?: boolean;
  totalFare?: number | null;
  baseFare?: number | null;
  fareStatus?: string;
  claimedBy?: string | null;
  createdAt: string;
};

async function fetchJobs(): Promise<OperationJob[]> {
  const response = await fetch("/api/jobs", { credentials: "include" });
  if (!response.ok) throw new Error("Unable to load jobs");
  return response.json() as Promise<OperationJob[]>;
}

function amount(value: number | null | undefined, fallback?: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = fallback?.match(/^TTD\s+([\d,]+(?:\.\d+)?)/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function money(value: number): string {
  return `TT$${value.toLocaleString("en-TT", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function dateLabel(value?: string | null): string {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString("en-TT", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

function statusClass(status: string): string {
  if (status === "completed" || status === "deposit_received") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
  if (status === "urgent" || status === "cancelled" || status === "expired") return "bg-red-500/10 text-red-300 border-red-500/30";
  if (status === "pending_deposit") return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  return "bg-muted/40 text-muted-foreground border-border";
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wide ${statusClass(status)}`}>{status.replace(/_/g, " ")}</span>;
}

function PageHeader({ icon: Icon, eyebrow, title, description }: { icon: typeof ListChecks; eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <Icon className="h-4 w-4" />
          <p className="text-xs font-mono uppercase tracking-widest">{eyebrow}</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function AdminOperations() {
  const [location] = useLocation();
  const section = location.split("/").pop() ?? "jobs";
  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ["admin-operations-jobs"],
    queryFn: fetchJobs,
    refetchInterval: 15_000,
    retry: false,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => jobs.filter(job => {
    if (status !== "all" && job.status !== status) return false;
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return [job.id, job.pickup, job.dropoff, job.name, job.phone, job.claimedBy]
      .some(value => value?.toLowerCase().includes(query));
  }), [jobs, search, status]);

  if (section === "calendar") return <CalendarView jobs={jobs} loading={isLoading} error={isError} />;
  if (section === "payments") return <PaymentsView jobs={jobs} loading={isLoading} error={isError} />;
  if (section === "customers") return <CustomersView jobs={jobs} loading={isLoading} error={isError} />;
  if (section === "reports") return <ReportsView jobs={jobs} loading={isLoading} error={isError} />;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ListChecks} eyebrow="Operations" title="Jobs" description="Search and review every booking without changing the existing dispatch workflow." />
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ID, customer, phone, pickup, dropoff…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="pending_deposit">Awaiting deposit</option>
            <option value="deposit_received">Deposit received</option>
            <option value="claimed">Claimed</option>
            <option value="driver_en_route">En route</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
          <a href="/api/jobs/export" className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-xs font-mono font-bold uppercase hover:border-primary/60 hover:text-primary">Export CSV</a>
        </div>
        <JobList jobs={filtered} loading={isLoading} error={isError} />
      </div>
    </Layout>
  );
}

function JobList({ jobs, loading, error }: { jobs: OperationJob[]; loading: boolean; error: boolean }) {
  if (loading) return <div className="space-y-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-24 w-full rounded-xl" />)}</div>;
  if (error) return <EmptyState title="Unable to load jobs" description="The dispatch API did not return a job list. Try refreshing." />;
  if (!jobs.length) return <EmptyState title="No bookings found" description="Try changing the search or status filter." />;
  return (
    <div className="space-y-2">
      {jobs.map(job => (
        <a key={job.id} href={`/jobs/${job.id}`} className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">#{job.id}</span>
                <StatusBadge status={job.status} />
                {job.urgency === "urgent" && <span className="text-[10px] font-bold uppercase text-red-300">Urgent</span>}
              </div>
              <p className="mt-2 truncate text-sm font-semibold">{job.pickup} <span className="text-muted-foreground">→</span> {job.dropoff}</p>
              <p className="mt-1 text-xs text-muted-foreground">{job.name ?? "Customer not supplied"} · {job.passengerCount ?? job.passengers ?? "Passengers not set"} · {job.numberBuses ?? 1} bus{(job.numberBuses ?? 1) === 1 ? "" : "es"}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs md:min-w-64">
              <span className="text-muted-foreground">Pickup</span><span className="text-right">{dateLabel(job.pickupDatetime)}</span>
              <span className="text-muted-foreground">Driver</span><span className="truncate text-right">{job.claimedBy ?? "Unassigned"}</span>
              <span className="text-muted-foreground">Total</span><span className="text-right font-mono text-primary">{money(amount(job.totalFare, job.price))}</span>
            </div>
            <ChevronRight className="hidden h-4 w-4 text-muted-foreground md:block" />
          </div>
        </a>
      ))}
    </div>
  );
}

function CalendarView({ jobs, loading, error }: ViewProps) {
  const scheduled = [...jobs].filter(job => job.pickupDatetime).sort((a, b) => new Date(a.pickupDatetime!).getTime() - new Date(b.pickupDatetime!).getTime());
  return <Layout><div className="space-y-6"><PageHeader icon={CalendarDays} eyebrow="Operations" title="Dispatch Calendar" description="Chronological pickup schedule built from the existing booking timestamps." /><Schedule jobs={scheduled} loading={loading} error={error} /></div></Layout>;
}

function Schedule({ jobs, loading, error }: { jobs: OperationJob[]; loading: boolean; error: boolean }) {
  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error) return <EmptyState title="Unable to load schedule" description="Try refreshing the dispatch calendar." />;
  if (!jobs.length) return <EmptyState title="No scheduled runs" description="Bookings with pickup dates will appear here." />;
  return <div className="space-y-2">{jobs.map(job => <a key={job.id} href={`/jobs/${job.id}`} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/60 sm:flex-row sm:items-center"><div className="flex w-36 items-center gap-2 text-sm font-mono text-primary"><Clock className="h-4 w-4" />{dateLabel(job.pickupDatetime)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{job.pickup} → {job.dropoff}</p><p className="text-xs text-muted-foreground">{job.name ?? "Customer"} · {job.passengerCount ?? job.passengers ?? "Passengers not set"} · {job.numberBuses ?? 1} bus{(job.numberBuses ?? 1) === 1 ? "" : "es"}</p></div><StatusBadge status={job.status} /></a>)}</div>;
}

function PaymentsView({ jobs, loading, error }: ViewProps) {
  const totals = jobs.reduce((acc, job) => {
    const total = amount(job.totalFare, job.price);
    const deposit = job.depositAmount ?? 0;
    acc.total += total; acc.deposit += job.depositPaid ? deposit : 0; acc.outstanding += job.depositPaid ? Math.max(0, total - deposit) : deposit;
    return acc;
  }, { total: 0, deposit: 0, outstanding: 0 });
  return <Layout><div className="space-y-6"><PageHeader icon={CreditCard} eyebrow="Finance" title="Payments" description="Deposit and balance visibility using recorded booking amounts. No payment provider actions are added here." /><div className="grid gap-3 sm:grid-cols-3"><Metric label="Booking value" value={money(totals.total)} icon={DollarSign} /><Metric label="Deposits received" value={money(totals.deposit)} icon={CheckCircle2} /><Metric label="Outstanding" value={money(totals.outstanding)} icon={AlertTriangle} /></div><div className="space-y-2">{loading ? <Skeleton className="h-48 w-full rounded-xl" /> : error ? <EmptyState title="Unable to load payments" description="Try refreshing this page." /> : jobs.length === 0 ? <EmptyState title="No payment records" description="Bookings will appear here once they exist." /> : jobs.map(job => { const total = amount(job.totalFare, job.price); const deposit = job.depositAmount ?? 0; return <a key={job.id} href={`/jobs/${job.id}`} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/60 sm:flex-row sm:items-center"><span className="font-mono text-xs text-primary sm:w-28">#{job.id}</span><span className="min-w-0 flex-1 truncate text-sm">{job.name ?? "Customer"} · {job.pickup} → {job.dropoff}</span><span className="text-sm font-mono">{money(total)}</span><span className={`text-xs font-bold ${job.depositPaid ? "text-emerald-300" : "text-amber-300"}`}>{job.depositPaid ? `Deposit paid · ${money(deposit)}` : `Deposit pending · ${money(deposit)}`}</span></a>; })}</div></div></Layout>;
}

function CustomersView({ jobs, loading, error }: ViewProps) {
  const customers = useMemo(() => {
    const groups = new Map<string, { name: string; phone: string; bookings: number; value: number; last: string }>();
    jobs.forEach(job => {
      const phone = job.phone ?? "No phone";
      const key = phone === "No phone" ? `${job.name ?? "Unknown"}-${job.id}` : phone;
      const current = groups.get(key) ?? { name: job.name ?? "Unknown customer", phone, bookings: 0, value: 0, last: job.createdAt };
      current.bookings += 1; current.value += amount(job.totalFare, job.price);
      if (new Date(job.createdAt) > new Date(current.last)) current.last = job.createdAt;
      groups.set(key, current);
    });
    return [...groups.values()].sort((a, b) => new Date(b.last).getTime() - new Date(a.last).getTime());
  }, [jobs]);
  return <Layout><div className="space-y-6"><PageHeader icon={Users} eyebrow="Relationships" title="Customers" description="Customer summaries derived from existing bookings; no separate customer records are created." />{loading ? <Skeleton className="h-48 w-full rounded-xl" /> : error ? <EmptyState title="Unable to load customers" description="Try refreshing this page." /> : !customers.length ? <EmptyState title="No customers yet" description="Customer summaries will appear after the first booking." /> : <div className="grid gap-3 md:grid-cols-2">{customers.map(customer => <Card key={`${customer.phone}-${customer.name}`} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{customer.name}</p><p className="mt-1 text-xs text-muted-foreground">{customer.phone}</p></div><Users className="h-4 w-4 text-primary" /></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><p className="text-muted-foreground">Bookings</p><p className="mt-1 font-mono font-bold">{customer.bookings}</p></div><div><p className="text-muted-foreground">Value</p><p className="mt-1 font-mono font-bold text-primary">{money(customer.value)}</p></div><div><p className="text-muted-foreground">Last booking</p><p className="mt-1">{new Date(customer.last).toLocaleDateString("en-TT")}</p></div></div></Card>)}</div>}</div></Layout>;
}

function ReportsView({ jobs, loading, error }: ViewProps) {
  const completed = jobs.filter(job => job.status === "completed");
  const routes = new Map<string, number>();
  jobs.forEach(job => routes.set(`${job.pickup} → ${job.dropoff}`, (routes.get(`${job.pickup} → ${job.dropoff}`) ?? 0) + 1));
  const topRoutes = [...routes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return <Layout><div className="space-y-6"><PageHeader icon={BarChart3} eyebrow="Performance" title="Reports" description="Operational summaries calculated from actual booking records." />{loading ? <Skeleton className="h-48 w-full rounded-xl" /> : error ? <EmptyState title="Unable to load reports" description="Try refreshing this page." /> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total bookings" value={String(jobs.length)} icon={ListChecks} /><Metric label="Completed" value={String(completed.length)} icon={CheckCircle2} /><Metric label="Completed value" value={money(completed.reduce((sum, job) => sum + amount(job.totalFare, job.price), 0))} icon={DollarSign} /><Metric label="Urgent" value={String(jobs.filter(job => job.urgency === "urgent").length)} icon={AlertTriangle} /></div><Card className="p-5"><p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Most booked routes</p><div className="mt-4 space-y-3">{topRoutes.length ? topRoutes.map(([route, count]) => <div key={route} className="flex items-center gap-3 text-sm"><span className="min-w-0 flex-1 truncate">{route}</span><div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(12, (count / topRoutes[0][1]) * 100)}%` }} /></div><span className="w-12 text-right font-mono text-xs text-muted-foreground">{count}</span></div>) : <p className="text-sm text-muted-foreground">No route data yet.</p>}</div></Card></>}</div></Layout>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof DollarSign }) {
  return <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary" /></div><p className="mt-3 text-2xl font-mono font-bold">{value}</p></Card>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-muted/10 px-5 py-12 text-center"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

type ViewProps = { jobs: OperationJob[]; loading: boolean; error: boolean };