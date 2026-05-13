import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetJob, useClaimJob } from "@workspace/api-client-react";
import { Loader2, MapPin, Navigation, Users, DollarSign, Phone, User, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "mxihub_driver";

function getStoredDriver(): { name: string; claimedJobs: string[] } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return { name: "", claimedJobs: [] };
  }
}

function storeDriverClaim(name: string, jobId: string) {
  const data = getStoredDriver();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    name,
    claimedJobs: [...(data.claimedJobs ?? []), jobId],
  }));
}

export default function DriverJob() {
  const { id } = useParams<{ id: string }>();
  const [driverName, setDriverName] = useState("");
  const [claimedByMe, setClaimedByMe] = useState(false);
  const [nameError, setNameError] = useState("");

  const { data: job, isLoading, isError, refetch } = useGetJob(id ?? "", {
    query: { enabled: !!id, retry: false },
  });

  const claimJob = useClaimJob();

  useEffect(() => {
    const stored = getStoredDriver();
    if (stored.name) setDriverName(stored.name);
    if (id && stored.claimedJobs?.includes(id)) setClaimedByMe(true);
  }, [id]);

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f3d2e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-[#0f3d2e] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <XCircle className="w-12 h-12 text-red-400" />
        <h1 className="text-xl font-black text-white">Job Not Found</h1>
        <p className="text-teal-300 text-sm">This job link may be invalid or expired.</p>
      </div>
    );
  }

  const isCompleted = job.status === "completed";
  const isClaimed = job.status === "claimed";
  const isPending = job.status === "pending";
  const claimedByOther = isClaimed && !claimedByMe;

  function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!driverName.trim()) { setNameError("Please enter your name."); return; }
    setNameError("");
    claimJob.mutate(
      { id, data: { driverName: driverName.trim() } },
      {
        onSuccess: () => {
          storeDriverClaim(driverName.trim(), id);
          setClaimedByMe(true);
          refetch();
        },
        onError: () => {
          refetch();
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-[#0f3d2e] flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126, #f59e0b, #0f3d2e)" }} />
      <header className="px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-base shadow"
             style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <span className="text-teal-900">M</span>
        </div>
        <div>
          <p className="text-white font-black text-sm leading-none">Maxi Hub TT</p>
          <p className="text-teal-400 text-xs">Driver Portal</p>
        </div>
        <span className="ml-auto text-xs text-teal-500 font-mono">#{job.id}</span>
      </header>

      <main className="flex-1 px-5 py-4 flex flex-col gap-4 max-w-md mx-auto w-full">

        {/* Job card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 space-y-3 border border-white/10">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <div>
              <p className="text-teal-400 text-xs uppercase tracking-wider font-semibold">Pickup</p>
              <p className="text-white font-bold">{job.pickup}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Navigation className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <div>
              <p className="text-teal-400 text-xs uppercase tracking-wider font-semibold">Dropoff</p>
              <p className="text-white font-bold">{job.dropoff}</p>
            </div>
          </div>
          {job.passengers && (
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-teal-300 mt-1 shrink-0" />
              <div>
                <p className="text-teal-400 text-xs uppercase tracking-wider font-semibold">Passengers</p>
                <p className="text-white font-bold">{job.passengers}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <DollarSign className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <div>
              <p className="text-teal-400 text-xs uppercase tracking-wider font-semibold">Fare</p>
              <p className="text-amber-300 font-black text-lg leading-tight">{job.price}</p>
            </div>
          </div>
        </div>

        {/* Status area */}
        {isCompleted && (
          <div className="bg-gray-800/60 rounded-2xl p-5 text-center border border-gray-600">
            <CheckCircle2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-white font-bold">Job Completed</p>
            <p className="text-gray-400 text-sm mt-1">This job has been marked as complete.</p>
          </div>
        )}

        {claimedByOther && (
          <div className="bg-red-900/40 rounded-2xl p-5 text-center border border-red-700/50">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-white font-bold">Already Claimed</p>
            <p className="text-red-300 text-sm mt-1">
              This job was taken by {job.claimedBy ?? "another driver"}.
            </p>
          </div>
        )}

        {(isPending || (isClaimed && claimedByMe)) && (
          <>
            {/* Customer details — shown after claiming */}
            {claimedByMe && (
              <div className="bg-emerald-900/50 rounded-2xl p-5 border border-emerald-600/50 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <p className="text-emerald-300 font-black text-sm uppercase tracking-wide">Job Claimed — Contact Customer</p>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-teal-400 text-xs uppercase tracking-wider font-semibold">Customer Name</p>
                    <p className="text-white font-bold">{job.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-teal-400 text-xs uppercase tracking-wider font-semibold">Phone Number</p>
                    <a href={`tel:${job.phone}`} className="text-emerald-300 font-black text-lg hover:text-emerald-200 transition-colors">
                      {job.phone}
                    </a>
                  </div>
                </div>
                <a
                  href={`tel:${job.phone}`}
                  className="block w-full mt-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-teal-900 font-black text-center text-sm transition-colors"
                >
                  Call Customer Now
                </a>
              </div>
            )}

            {/* Claim form — shown when job is still pending */}
            {isPending && !claimedByMe && (
              <form onSubmit={handleClaim} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-teal-300 text-xs font-semibold uppercase tracking-wider">Your Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Marcus"
                    value={driverName}
                    onChange={e => { setDriverName(e.target.value); setNameError(""); }}
                    className="w-full h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-teal-500 focus:outline-none focus:border-amber-400 text-sm"
                  />
                  {nameError && <p className="text-red-400 text-xs">{nameError}</p>}
                </div>
                {claimJob.isError && (
                  <p className="text-red-400 text-xs bg-red-900/30 rounded-xl px-4 py-2 border border-red-700/40">
                    This job may have already been claimed. Refreshing…
                  </p>
                )}
                <button
                  type="submit"
                  disabled={claimJob.isPending}
                  className="w-full py-4 rounded-xl font-black text-teal-900 text-base disabled:opacity-60 transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                >
                  {claimJob.isPending
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Claiming…</span>
                    : "Claim This Job"}
                </button>
                <p className="text-teal-500 text-xs text-center">
                  Tapping Claim confirms you're accepting this run. Customer details will be shown immediately.
                </p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
