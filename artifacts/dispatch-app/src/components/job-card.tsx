import { Job, useCompleteJob, useMarkDepositPaid, useUpdateJobStatus, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { DollarSign, Clock, CheckCircle2, CreditCard, XCircle, Phone, MessageCircle, Send, Pencil, Save, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { JobStatusBadge, UrgencyBadge } from "./job-status-badge";
import { formatRelativeTime } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface JobCardProps {
  job: Job;
  index: number;
}

type ExtJob = Job & {
  urgency?: string;
  depositAmount?: number | null;
  depositPaid?: boolean;
  phone?: string;
  name?: string;
  pickupDatetime?: string | null;
  notes?: string | null;
};

function formatPickupDatetime(dt: string | null | undefined): string | null {
  if (!dt) return null;
  try {
    return new Date(dt).toLocaleString("en-TT", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch {
    return dt;
  }
}

function formatWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 7) return `1868${digits}`;
  if (digits.length === 10 && digits.startsWith("868")) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1868")) return digits;
  return digits.length >= 7 ? digits : null;
}

async function patchJob(id: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/jobs/${id}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save");
}

async function redispatch(id: string) {
  const res = await fetch(`/api/jobs/${id}/redispatch`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Redispatch failed");
}

export function JobCard({ job, index }: JobCardProps) {
  const j = job as ExtJob;
  const isPendingDeposit = j.status === "pending_deposit";
  const isCompleted = j.status === "completed";
  const isCancelled = j.status === "cancelled";
  const isExpired = j.status === "expired";
  const isDone = isCompleted || isCancelled || isExpired;

  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmDeposit, setConfirmDeposit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [redispatching, setRedispatching] = useState(false);
  const [redispatchDone, setRedispatchDone] = useState(false);

  // Inline price edit
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceVal, setPriceVal] = useState(j.price);
  const [savingPrice, setSavingPrice] = useState(false);

  // Inline deposit edit
  const [editingDeposit, setEditingDeposit] = useState(false);
  const [depositVal, setDepositVal] = useState(String(j.depositAmount ?? ""));
  const [savingDeposit, setSavingDeposit] = useState(false);

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
    completeJob.mutate({ id: j.id }, {
      onSuccess: () => { invalidateAll(); setConfirmComplete(false); },
    });
  };

  const handleMarkDepositPaid = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirmDeposit) { setConfirmDeposit(true); return; }
    markDepositPaid.mutate({ id: j.id }, {
      onSuccess: () => { invalidateAll(); setConfirmDeposit(false); },
    });
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirmCancel) { setConfirmCancel(true); return; }
    updateStatus.mutate({ id: j.id, data: { status: "cancelled" } }, {
      onSuccess: () => { invalidateAll(); setConfirmCancel(false); },
    });
  };

  const handleRedispatch = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setRedispatching(true);
    try {
      await redispatch(j.id);
      setRedispatchDone(true);
      setTimeout(() => setRedispatchDone(false), 3000);
    } catch {}
    setRedispatching(false);
  };

  const handleSavePrice = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSavingPrice(true);
    try {
      await patchJob(j.id, "price", { price: priceVal });
      invalidateAll();
      setEditingPrice(false);
    } catch {}
    setSavingPrice(false);
  };

  const handleSaveDeposit = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const amt = parseInt(depositVal);
    if (isNaN(amt)) return;
    setSavingDeposit(true);
    try {
      await patchJob(j.id, "deposit-amount", { depositAmount: amt });
      invalidateAll();
      setEditingDeposit(false);
    } catch {}
    setSavingDeposit(false);
  };

  const waNumber = formatWhatsApp(j.phone);
  const pickupFormatted = formatPickupDatetime(j.pickupDatetime);
  const waText = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi ${j.name ?? "there"}, this is Maxi Hub TT regarding your booking from ${j.pickup} to ${j.dropoff}.`)}`
    : null;

  const canRedispatch = !isDone && ["pending", "deposit_received", "pending_deposit"].includes(j.status);

  return (
    <Link href={`/jobs/${j.id}`}>
      <Card
        className={`group relative overflow-hidden border transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 cursor-pointer ${
          isDone ? "border-border/50 opacity-75 hover:opacity-100" :
          isPendingDeposit ? "border-yellow-500/40 bg-yellow-500/5" :
          "border-border"
        } animate-in fade-in slide-in-from-bottom-4 fill-mode-both`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Left accent bar */}
        {!isDone && (
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
            j.urgency === "urgent" ? "bg-red-500" :
            j.urgency === "same_day" ? "bg-amber-500" :
            isPendingDeposit ? "bg-yellow-500" :
            "bg-orange-500"
          }`} />
        )}

        <div className="p-5 flex flex-col gap-3">

          {/* Top row: ID + badges + price */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">#{j.id.slice(0, 8)}</span>
              <JobStatusBadge status={j.status} />
              <UrgencyBadge urgency={j.urgency} />
            </div>

            {/* Inline price */}
            {editingPrice ? (
              <div className="flex items-center gap-1" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                <input
                  autoFocus
                  value={priceVal}
                  onChange={e => setPriceVal(e.target.value)}
                  className="w-32 h-7 px-2 rounded border border-primary/50 bg-background text-primary font-mono text-sm font-bold focus:outline-none"
                />
                <button onClick={handleSavePrice} disabled={savingPrice} className="text-green-600 hover:text-green-700 p-1">
                  {savingPrice ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </button>
                <button onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingPrice(false); setPriceVal(j.price); }} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group/price">
                <div className="flex items-center text-primary font-mono font-bold text-lg">
                  <DollarSign className="h-4 w-4" />
                  {j.price}
                </div>
                {!isDone && (
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingPrice(true); setPriceVal(j.price); }}
                    className="opacity-0 group-hover/price:opacity-100 text-muted-foreground hover:text-primary transition-opacity p-1"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pickup datetime chip */}
          {pickupFormatted && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-primary bg-primary/8 border border-primary/20 rounded px-2 py-1 w-fit">
              <Clock className="h-3 w-3" />
              <span>{pickupFormatted}</span>
            </div>
          )}

          {/* Route + info grid */}
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
                    <p className="text-sm font-medium leading-snug">{j.pickup}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Dropoff</p>
                    <p className="text-sm font-medium leading-snug">{j.dropoff}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between items-start md:items-end text-sm text-muted-foreground font-mono bg-muted/20 p-3 rounded-md">
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between w-full">
                  <span className="uppercase text-xs">Customer</span>
                  <span className="text-foreground">{j.name}</span>
                </div>
                {j.claimedBy && (
                  <div className="flex justify-between w-full text-primary">
                    <span className="uppercase text-xs">Driver</span>
                    <span>{j.claimedBy}</span>
                  </div>
                )}

                {/* Deposit row with inline edit */}
                {j.depositAmount != null && (
                  <div className={`flex justify-between w-full items-center ${j.depositPaid ? "text-emerald-600" : "text-yellow-600"}`}>
                    <span className="uppercase text-xs">Deposit</span>
                    {editingDeposit ? (
                      <div className="flex items-center gap-1" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                        <span className="text-xs">TTD</span>
                        <input
                          autoFocus
                          value={depositVal}
                          onChange={e => setDepositVal(e.target.value)}
                          className="w-20 h-6 px-1.5 rounded border border-yellow-400 bg-background text-foreground font-mono text-xs focus:outline-none"
                        />
                        <button onClick={handleSaveDeposit} disabled={savingDeposit} className="text-green-600 hover:text-green-700">
                          {savingDeposit ? <Clock className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </button>
                        <button onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingDeposit(false); }} className="text-muted-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/dep">
                        <span className="font-bold">
                          TTD {j.depositAmount.toLocaleString()} {j.depositPaid ? "✓" : "— Unpaid"}
                        </span>
                        {!isDone && !j.depositPaid && (
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingDeposit(true); setDepositVal(String(j.depositAmount ?? "")); }}
                            className="opacity-0 group-hover/dep:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom action row */}
              <div className="flex items-center justify-between w-full mt-3 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(j.createdAt)}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">

                  {/* WhatsApp + Call shortcuts */}
                  {j.phone && (
                    <>
                      {waText && (
                        <a
                          href={waText}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md bg-green-500/10 text-green-700 hover:bg-green-600 hover:text-white transition-all"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WA
                        </a>
                      )}
                      <a
                        href={`tel:${j.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-700 hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </a>
                    </>
                  )}

                  {/* Re-dispatch to Telegram */}
                  {canRedispatch && (
                    <button
                      onClick={handleRedispatch}
                      disabled={redispatching}
                      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md transition-all ${
                        redispatchDone
                          ? "bg-primary/20 text-primary"
                          : "bg-muted/60 text-muted-foreground hover:bg-primary hover:text-white"
                      }`}
                    >
                      <Send className="h-3 w-3" />
                      {redispatching ? "…" : redispatchDone ? "Sent!" : "TG"}
                    </button>
                  )}

                  {/* Cancel */}
                  {j.status === "pending" && (
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

                  {/* Mark Deposit Paid */}
                  {!isDone && j.depositAmount != null && !j.depositPaid && (
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

                  {/* Complete */}
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
