import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetJob } from "@workspace/api-client-react";
import { useDriverAuth } from "@/components/driver-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Navigation, Users, DollarSign, Phone, User, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

async function doClaimJob(id: string): Promise<unknown> {
  const res = await fetch(`/api/jobs/${id}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to claim");
  return data;
}

export default function DriverJob() {
  const { id } = useParams<{ id: string }>();
  const { data: auth } = useDriverAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: job, isLoading, isError, refetch } = useGetJob(id ?? "", {
    query: { enabled: !!id, retry: false },
  });

  const claimMutation = useMutation({
    mutationFn: () => doClaimJob(id ?? ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-jobs"] });
      refetch();
    },
    onError: () => refetch(),
  });

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
        <button onClick={() => navigate("/driver/jobs")} className="text-teal-400 text-sm underline">
          Back to jobs board
        </button>
      </div>
    );
  }

  const driverName = auth?.name ?? "";
  const isMine = job.claimedBy === driverName;
  const isPending = job.status === "pending";
  const isClaimed = job.status === "claimed";
  const isCompleted = job.status === "completed";
  const claimedByOther = isClaimed && !isMine;

  return (
    <div className="min-h-screen bg-[#0f3d2e] flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126, #f59e0b, #0f3d2e)" }} />

      <header className="px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/driver/jobs")} className="text-teal-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-white font-black text-sm leading-none">Job #{job.id}</p>
          <p className="text-teal-400 text-xs">Driver Portal</p>
        </div>
      </header>

      <main className="flex-1 px-5 py-4 flex flex-col gap-4 max-w-md mx-auto w-full">
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
              <p className="text-amber-300 font-black text-lg">{job.price}</p>
            </div>
          </div>
        </div>

        {isCompleted && (
          <div className="bg-gray-800/60 rounded-2xl p-5 text-center border border-gray-600">
            <CheckCircle2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-white font-bold">Job Completed</p>
          </div>
        )}

        {claimedByOther && (
          <div className="bg-red-900/40 rounded-2xl p-5 text-center border border-red-700/50">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-white font-bold">Already Claimed</p>
            <p className="text-red-300 text-sm mt-1">Taken by {job.claimedBy ?? "another driver"}.</p>
          </div>
        )}

        {isMine && (
          <div className="bg-emerald-900/50 rounded-2xl p-5 border border-emerald-600/50 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <p className="text-emerald-300 font-black text-sm uppercase tracking-wide">Claimed — Customer Contact</p>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-teal-400 text-xs uppercase tracking-wider font-semibold">Name</p>
                <p className="text-white font-bold">{job.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-teal-400 text-xs uppercase tracking-wider font-semibold">Phone</p>
                <a href={`tel:${job.phone}`} className="text-emerald-300 font-black text-lg">{job.phone}</a>
              </div>
            </div>
            <a href={`tel:${job.phone}`} className="block w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-teal-900 font-black text-center text-sm transition-colors">
              Call Customer Now
            </a>
          </div>
        )}

        {isPending && (
          <>
            {claimMutation.isError && (
              <p className="text-red-400 text-xs bg-red-900/30 rounded-xl px-4 py-2 border border-red-700/40">
                Could not claim — job may have been taken. Refreshing…
              </p>
            )}
            <button
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              className="w-full py-4 rounded-xl font-black text-teal-900 text-base disabled:opacity-60 transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              {claimMutation.isPending
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Claiming…</span>
                : `Claim as ${driverName}`}
            </button>
            <p className="text-teal-500 text-xs text-center">Customer details shown immediately after claiming.</p>
          </>
        )}
      </main>
    </div>
  );
}
