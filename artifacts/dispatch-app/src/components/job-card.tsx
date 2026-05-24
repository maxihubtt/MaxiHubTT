import { Job, useCompleteJob, useMarkDepositPaid, useUpdateJobStatus, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { DollarSign, Clock, CheckCircle2, CreditCard, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { JobStatusBadge, UrgencyBadge } from "./job-status-badge";
import { formatRelativeTime } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface JobCardProps {
  job: Job;
  index: number;
}

export function JobCard({ job, index }: JobCardProps) {
  const isPendingDeposit = job.status === "pending_deposit";
  const isCompleted = job.status === "completed";
  const isCancelled = job.status === "cancelled";
  const isExpired = job.status === "expired";
  const isDone = isCompleted || isCancelled || isExpired;

  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmDeposit, setConfirmDeposit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const queryClient = useQueryClient();

  const completeJob = useCompleteJob();
  const markDepositPaid = useMarkDepositPaid();
  const updateStatus = useUpdateJobStatus();

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
  }

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirmComplete) { setConfirmComplete(true); return; }
    completeJob.mutate({ id: job.id }, {
      onSuccess: () => { invalidateAll(); setConfirmComplete(false); },
    });
  };

  const handleMarkDepositPaid = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirmDeposit) { setConfirmDeposit(true); return; }
    markDepositPaid.mutate({ id: job.id }, {
      onSuccess: () => { invalidateAll(); setConfirmDeposit(false); },
    });
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirmCancel) { setConfirmCancel(true); return; }
    updateStatus.mutate({ id: job.id, data: { status: "cancelled" } }, {
      onSuccess: () => { invalidateAll(); setConfirmCancel(false); },
    });
  };

  const urgency = (job as Job & { urgency?: string }).urgency;
  const depositAmount = (job as Job & { depositAmount?: number | null }).depositAmount;
  const depositPaid = (job as Job & { depositPaid?: boolean }).depositPaid;

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card
        className={`group relative overflow-hidden border transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 cursor-pointer ${
          isDone ? "border-border/50 opacity-75 hover:opacity-100" :
          isPendingDeposit ? "border-yellow-500/40 bg-yellow-500/5" :
          "border-border"
        } animate-in fade-in slide-in-from-bottom-4 fill-mode-both`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Left accent bar by urgency */}
        {!isDone && (
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
            urgency === "urgent" ? "bg-red-500" :
            urgency === "same_day" ? "bg-amber-500" :
            isPendingDeposit ? "bg-yellow-500" :
            "bg-orange-500"
          }`} />
        )}

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">#{job.id.slice(0, 8)}</span>
              <JobStatusBadge status={job.status} />
              <UrgencyBadge urgency={urgency} />
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
                {depositAmount != null && (
                  <div className={`flex justify-between w-full ${depositPaid ? "text-emerald-600" : "text-yellow-600"}`}>
                    <span className="uppercase text-xs">Deposit</span>
                    <span className="font-bold">
                      TTD {depositAmount.toLocaleString()} {depositPaid ? "✓" : "— Unpaid"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between w-full mt-4 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(job.createdAt)}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Cancel button — only for pending jobs (no deposit yet) */}
                  {job.status === "pending" && (
                    <button
                      onClick={handleCancel}
                      disabled={updateStatus.isPending}
                      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md transition-all ${
                        confirmCancel
                          ? "bg-red-600 text-white animate-pulse"
                          : "bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white"
                      }`}
                    >
                      <XCircle className="h-3 w-3" />
                      {updateStatus.isPending ? "…" : confirmCancel ? "Confirm?" : "Cancel"}
                    </button>
                  )}

                  {/* Mark Deposit Paid button */}
                  {isPendingDeposit && !depositPaid && (
                    <button
                      onClick={handleMarkDepositPaid}
                      disabled={markDepositPaid.isPending}
                      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md transition-all ${
                        confirmDeposit
                          ? "bg-emerald-600 text-white animate-pulse"
                          : "bg-yellow-500/20 text-yellow-700 hover:bg-emerald-600 hover:text-white"
                      }`}
                    >
                      <CreditCard className="h-3 w-3" />
                      {markDepositPaid.isPending ? "…" : confirmDeposit ? "Confirm?" : "Deposit Paid"}
                    </button>
                  )}

                  {/* Complete button */}
                  {!isDone && (
                    <button
                      onClick={handleComplete}
                      disabled={completeJob.isPending}
                      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md transition-all ${
                        confirmComplete
                          ? "bg-green-600 text-white animate-pulse"
                          : "bg-muted/60 text-muted-foreground hover:bg-green-600 hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {completeJob.isPending ? "…" : confirmComplete ? "Confirm?" : "Complete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
