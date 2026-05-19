import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  MapPin, Navigation, Users, DollarSign, Phone, User,
  CheckCircle2, LogOut, Loader2, RefreshCw, BriefcaseBusiness
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

async function fetchDriverJobs(): Promise<DriverJob[]> {
  const res = await fetch("/api/driver/jobs", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json() as Promise<DriverJob[]>;
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

async function doLogout() {
  await fetch("/api/auth/driver-logout", { method: "POST", credentials: "include" });
}

function JobCard({ job, isMine, onClaim, claiming }: {
  job: DriverJob;
  isMine: boolean;
  onClaim: (id: string) => void;
  claiming: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${
      isMine
        ? "bg-emerald-900/40 border-emerald-600/40"
        : "bg-white/8 border-white/10"
    }`}>
      {/* Route */}
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

      {/* Meta row */}
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

      {/* Pending — claim button */}
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

      {/* Claimed by me — show contact */}
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

export default function DriverJobs() {
  const { data: auth } = useDriverAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data: jobs = [], isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["driver-jobs"],
    queryFn: fetchDriverJobs,
    refetchInterval: 5000,
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: doClaimJob,
    onSuccess: () => {
      setClaimingId(null);
      setClaimError(null);
      qc.invalidateQueries({ queryKey: ["driver-jobs"] });
    },
    onError: (err: Error) => {
      setClaimingId(null);
      setClaimError(err.message);
      qc.invalidateQueries({ queryKey: ["driver-jobs"] });
    },
  });

  function handleClaim(id: string) {
    setClaimingId(id);
    setClaimError(null);
    claimMutation.mutate(id);
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
          {isFetching && <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-teal-500 hover:text-red-400 transition-colors text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 space-y-6 max-w-md mx-auto w-full">

        {/* Pending jobs */}
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
                <JobCard
                  key={job.id}
                  job={job}
                  isMine={false}
                  onClaim={handleClaim}
                  claiming={claimingId === job.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Claimed by me */}
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
                <JobCard
                  key={job.id}
                  job={job}
                  isMine={true}
                  onClaim={handleClaim}
                  claiming={false}
                />
              ))}
            </div>
          </section>
        )}

        {lastUpdated && (
          <p className="text-center text-teal-800 text-[10px] font-mono">
            Last updated {lastUpdated} · refreshes every 5s
          </p>
        )}
      </main>
    </div>
  );
}
