import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  MapPin, Navigation, Users, DollarSign, Phone, User,
  CheckCircle2, LogOut, Loader2, RefreshCw, BriefcaseBusiness,
  Bell, BellOff, Clock, Wifi, WifiOff,
} from "lucide-react";
import { useDriverAuth } from "@/components/driver-guard";

interface DriverJob {
  id: string;
  pickup: string;
  dropoff: string;
  passengers: string | null;
  price: string;
  status: "pending" | "claimed" | "completed";
  claimedBy: string | null;
  name: string;
  phone: string;
  createdAt: string;
}

interface HistoryJob {
  id: string;
  pickup: string;
  dropoff: string;
  status: "pending" | "claimed" | "completed";
  price: string;
  passengers: string | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchDriverJobs(): Promise<DriverJob[]> {
  const res = await fetch("/api/driver/jobs", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json() as Promise<DriverJob[]>;
}

async function fetchJobHistory(): Promise<HistoryJob[]> {
  const res = await fetch("/api/driver/jobs/history", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load history");
  return res.json() as Promise<HistoryJob[]>;
}

async function doClaimJob(id: string): Promise<DriverJob> {
  const res = await fetch(`/api/jobs/${id}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  const data = await res.json() as DriverJob & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to claim job");
  return data;
}

async function doSetAvailability(availability: "available" | "offline"): Promise<void> {
  const res = await fetch("/api/drivers/availability", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ availability }),
  });
  if (!res.ok) throw new Error("Failed to update availability");
}

async function doLogout() {
  await fetch("/api/auth/driver-logout", { method: "POST", credentials: "include" });
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function JobCard({ job, isMine, onClaim, claiming }: {
  job: DriverJob;
  isMine: boolean;
  onClaim: (id: string) => void;
  claiming: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${
      isMine ? "bg-emerald-900/40 border-emerald-600/40" : "bg-white/8 border-white/10"
    }`}>
      <div className="space-y-2">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-teal-500 text-[10px] uppercase tracking-wider font-semibold leading-none mb-0.5">From</p>
            <p className="text-white font-bold text-sm leading-tight">{job.pickup}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-teal-500 text-[10px] uppercase tracking-wider font-semibold leading-none mb-0.5">To</p>
            <p className="text-white font-bold text-sm leading-tight">{job.dropoff}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {job.passengers && (
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-teal-300 text-xs">{job.passengers}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300 font-black text-sm">{job.price}</span>
        </div>
        <span className="ml-auto text-teal-700 text-[10px] font-mono">#{job.id}</span>
      </div>
      {job.status === "pending" && !isMine && (
        <button
          onClick={() => onClaim(job.id)}
          disabled={claiming}
          className="w-full py-3 rounded-xl font-black text-teal-900 text-sm disabled:opacity-60 active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          {claiming
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Claiming…</span>
            : "Claim This Job"}
        </button>
      )}
      {isMine && (
        <div className="space-y-2 pt-1 border-t border-emerald-700/40">
          <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Claimed — Customer Contact
          </p>
          <div className="flex items-center gap-2.5">
            <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-white font-semibold text-sm">{job.name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <a href={`tel:${job.phone}`} className="text-emerald-300 font-black text-base hover:text-emerald-200 transition-colors">
              {job.phone}
            </a>
          </div>
          <a
            href={`tel:${job.phone}`}
            className="block w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-teal-900 font-black text-sm text-center transition-colors"
          >
            Call Customer
          </a>
        </div>
      )}
    </div>
  );
}

function HistoryCard({ job }: { job: HistoryJob }) {
  const statusColor = job.status === "completed"
    ? "text-emerald-400 bg-emerald-900/30"
    : job.status === "claimed"
      ? "text-amber-400 bg-amber-900/30"
      : "text-teal-400 bg-teal-900/30";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
            <p className="text-white text-xs font-semibold truncate">{job.pickup}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
            <p className="text-teal-300 text-xs truncate">{job.dropoff}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-amber-300 font-black text-sm">{job.price}</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor}`}>
            {job.status}
          </span>
        </div>
      </div>
      <p className="text-teal-700 text-[10px] font-mono">
        {new Date(job.createdAt).toLocaleDateString("en-TT", { day: "numeric", month: "short", year: "numeric" })} · #{job.id}
      </p>
    </div>
  );
}

export default function DriverJobs() {
  const { data: auth } = useDriverAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [tab, setTab] = useState<"jobs" | "history">("jobs");
  const [availability, setAvailability] = useState<"available" | "offline">("offline");
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [pushSub, setPushSub] = useState<PushSubscription | null>(null);

  const { data: jobs = [], isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["driver-jobs"],
    queryFn: fetchDriverJobs,
    refetchInterval: 5000,
    retry: false,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["driver-jobs-history"],
    queryFn: fetchJobHistory,
    enabled: tab === "history",
    retry: false,
  });

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) { setPushSub(sub); setPushStatus("granted"); }
          else if (Notification.permission === "denied") setPushStatus("denied");
        });
      });
    }
  }, []);

  const claimMutation = useMutation({
    mutationFn: doClaimJob,
    onSuccess: () => {
      setClaimingId(null); setClaimError(null);
      qc.invalidateQueries({ queryKey: ["driver-jobs"] });
    },
    onError: (err: Error) => {
      setClaimingId(null); setClaimError(err.message);
      qc.invalidateQueries({ queryKey: ["driver-jobs"] });
    },
  });

  function handleClaim(id: string) {
    setClaimingId(id); setClaimError(null);
    claimMutation.mutate(id);
  }

  async function handleToggleAvailability() {
    const next = availability === "available" ? "offline" : "available";
    setTogglingAvail(true);
    try { await doSetAvailability(next); setAvailability(next); } catch {}
    setTogglingAvail(false);
  }

  async function handleEnablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPushStatus("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setPushStatus("denied"); return; }
      const vapidRes = await fetch("/api/drivers/push-key");
      if (!vapidRes.ok) { setPushStatus("idle"); return; }
      const { publicKey } = await vapidRes.json() as { publicKey: string };
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicKey),
      });
      await fetch("/api/drivers/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sub.toJSON()),
      });
      setPushSub(sub); setPushStatus("granted");
    } catch { setPushStatus("idle"); }
  }

  async function handleDisablePush() {
    if (!pushSub) return;
    await pushSub.unsubscribe();
    await fetch("/api/drivers/push-subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ endpoint: pushSub.endpoint }),
    });
    setPushSub(null); setPushStatus("idle");
  }

  async function handleLogout() {
    await doLogout();
    await qc.invalidateQueries({ queryKey: ["driver-auth"] });
    navigate("/driver/login");
  }

  const driverName = auth?.name ?? "";
  const pending = jobs.filter(j => j.status === "pending");
  const mine = jobs.filter(j => j.claimedBy === driverName && j.status !== "pending");

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-TT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const historyCompleted = history.filter(j => j.status === "completed");
  const historyEarnings = historyCompleted.reduce((sum, j) => {
    const n = parseFloat(j.price.replace(/[^0-9.]/g, ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div className="min-h-screen bg-[#0c3527] flex flex-col pb-10" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="h-1 w-full shrink-0" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126, #f59e0b, #0f3d2e)" }} />

      {/* Header */}
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow shrink-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          <span className="text-teal-900">M</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm leading-none">Maxi Hub TT</p>
          <p className="text-teal-400 text-xs truncate">{driverName}</p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && tab === "jobs" && <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-teal-500 hover:text-red-400 transition-colors text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Status bar: availability + push alerts */}
      <div className="px-4 mb-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={handleToggleAvailability}
          disabled={togglingAvail}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
            availability === "available"
              ? "bg-emerald-900/50 border-emerald-500/60 text-emerald-300"
              : "bg-white/5 border-white/10 text-teal-500"
          }`}
        >
          {togglingAvail
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : availability === "available" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />
          }
          {availability === "available" ? "Available" : "Offline"}
        </button>

        {pushStatus === "granted" ? (
          <button
            onClick={handleDisablePush}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-900/40 border border-amber-600/40 text-amber-300"
          >
            <Bell className="w-3 h-3" />
            Alerts On
          </button>
        ) : pushStatus === "denied" ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-teal-700">
            <BellOff className="w-3 h-3" />
            Alerts Blocked
          </span>
        ) : (
          <button
            onClick={handleEnablePush}
            disabled={pushStatus === "requesting"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-teal-400 hover:border-amber-600/40 hover:text-amber-300 transition-all"
          >
            {pushStatus === "requesting" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
            {pushStatus === "requesting" ? "Enabling…" : "Enable Alerts"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setTab("jobs")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "jobs" ? "bg-teal-700 text-white shadow" : "text-teal-500 hover:text-teal-300"
            }`}
          >
            <BriefcaseBusiness className="w-3.5 h-3.5" />
            Live Jobs
            {pending.length > 0 && (
              <span className="bg-amber-500 text-teal-900 text-[10px] font-black px-1.5 rounded-full">{pending.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "history" ? "bg-teal-700 text-white shadow" : "text-teal-500 hover:text-teal-300"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            My History
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 space-y-6 max-w-md mx-auto w-full">

        {tab === "jobs" && (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-black text-base">Available Jobs</h2>
                <span className="text-xs font-mono text-teal-600 bg-white/5 px-2 py-0.5 rounded-full">
                  {pending.length} pending
                </span>
              </div>

              {claimError && (
                <div className="mb-3 bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-2.5 text-red-300 text-xs">
                  {claimError} — refreshed automatically.
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
              ) : pending.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <BriefcaseBusiness className="w-10 h-10 text-teal-700 mx-auto" />
                  <p className="text-teal-500 text-sm">No pending jobs right now</p>
                  <p className="text-teal-700 text-xs">New jobs will appear here automatically</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map(job => (
                    <JobCard key={job.id} job={job} isMine={false} onClaim={handleClaim} claiming={claimingId === job.id} />
                  ))}
                </div>
              )}
            </section>

            {mine.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white font-black text-base">Your Claimed Jobs</h2>
                  <span className="text-xs font-mono text-emerald-600 bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    {mine.length} active
                  </span>
                </div>
                <div className="space-y-3">
                  {mine.map(job => (
                    <JobCard key={job.id} job={job} isMine={true} onClaim={handleClaim} claiming={false} />
                  ))}
                </div>
              </section>
            )}

            {lastUpdated && (
              <p className="text-center text-teal-800 text-[10px] font-mono">
                Last updated {lastUpdated} · refreshes every 5s
              </p>
            )}
          </>
        )}

        {tab === "history" && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-black text-base">Job History</h2>
              {!historyLoading && (
                <span className="text-xs font-mono text-teal-600 bg-white/5 px-2 py-0.5 rounded-full">
                  {history.length} total
                </span>
              )}
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Clock className="w-10 h-10 text-teal-700 mx-auto" />
                <p className="text-teal-500 text-sm">No job history yet</p>
                <p className="text-teal-700 text-xs">Claimed jobs will appear here</p>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-teal-400 text-[10px] uppercase tracking-wider font-semibold">Estimated Earnings</p>
                    <p className="text-amber-300 font-black text-xl">TT$ {historyEarnings.toFixed(0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-teal-400 text-[10px] uppercase tracking-wider font-semibold">Completed</p>
                    <p className="text-emerald-400 font-black text-xl">{historyCompleted.length}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {history.map(job => <HistoryCard key={job.id} job={job} />)}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
