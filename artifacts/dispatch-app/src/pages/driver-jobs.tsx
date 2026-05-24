import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  MapPin, Navigation, Users, DollarSign, Phone, User,
  CheckCircle2, LogOut, Loader2, RefreshCw, BriefcaseBusiness,
  Bell, BellOff, Clock, Wifi, WifiOff, Download, AlertCircle,
  MessageCircle, Car, Flag, Calendar, TrendingUp,
} from "lucide-react";
import { useDriverAuth } from "@/components/driver-guard";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface DriverJob {
  id: string;
  pickup: string;
  dropoff: string;
  passengers: string | null;
  price: string;
  status: string;
  urgency?: string;
  depositPaid?: boolean;
  claimedBy: string | null;
  name: string;
  phone: string;
  pickupDatetime: string | null;
  createdAt: string;
}

interface HistoryJob {
  id: string;
  pickup: string;
  dropoff: string;
  status: string;
  urgency?: string;
  price: string;
  passengers: string | null;
  pickupDatetime: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── API helpers ────────────────────────────────────────────────────────────────

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

async function doUpdateDriverStatus(id: string, status: "driver_en_route" | "completed"): Promise<void> {
  const res = await fetch(`/api/jobs/${id}/driver-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  const data = await res.json() as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to update status");
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtPickupTime(iso: string): string {
  return new Date(iso).toLocaleString("en-TT", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function playNewJobAlert() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const tones = [880, 1100, 1320];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.14);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.15);
    });
  } catch {
    // Audio not supported — silently skip
  }
}

// ── Push helpers ───────────────────────────────────────────────────────────────

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/** Ensure the service worker is registered and active. Returns the registration. */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported on this browser.");
  }

  // Register if not already registered
  let reg: ServiceWorkerRegistration | undefined;
  try {
    // Try to find an existing registration first
    reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
  } catch {
    // Fallback: use serviceWorker.ready (waits for active registration)
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Service worker timed out after 10s")), 10_000)
      ),
    ]);
    return reg;
  }

  // Wait for the SW to become active (with timeout)
  if (reg.active) return reg;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Service worker took too long to activate")), 10_000);
    const sw = reg!.installing ?? reg!.waiting;
    if (!sw) { clearTimeout(timeout); resolve(); return; }
    sw.addEventListener("statechange", function handler() {
      if (this.state === "activated") {
        clearTimeout(timeout);
        sw.removeEventListener("statechange", handler);
        resolve();
      } else if (this.state === "redundant") {
        clearTimeout(timeout);
        sw.removeEventListener("statechange", handler);
        reject(new Error("Service worker became redundant"));
      }
    });
  });

  return reg;
}

// ── JobCard ────────────────────────────────────────────────────────────────────

function JobCard({ job, isMine, onClaim, claiming, onEnRoute, onComplete, enRouting, completing }: {
  job: DriverJob;
  isMine: boolean;
  onClaim: (id: string) => void;
  claiming: boolean;
  onEnRoute?: (id: string) => void;
  onComplete?: (id: string) => void;
  enRouting?: boolean;
  completing?: boolean;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.pickup)}`;
  const waUrl = `https://wa.me/${job.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm your Maxi Hub TT driver. I've claimed your job (#${job.id}): ${job.pickup} → ${job.dropoff}. I'll be in touch shortly!`)}`;
  const isEnRoute = job.status === "driver_en_route";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${
      isMine ? "bg-emerald-900/40 border-emerald-600/40" : "bg-white/8 border-white/10"
    }`}>
      {/* Pickup time banner */}
      {job.pickupDatetime && (
        <div className="flex items-center gap-2 bg-teal-900/40 rounded-xl px-3 py-1.5 border border-teal-700/30">
          <Calendar className="w-3 h-3 text-teal-400 shrink-0" />
          <span className="text-teal-200 text-xs font-bold">{fmtPickupTime(job.pickupDatetime)}</span>
        </div>
      )}

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

      <div className="flex items-center gap-4 flex-wrap">
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
        {job.urgency === "urgent" && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">⚡ URGENT</span>
        )}
        {job.urgency === "same_day" && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">🕐 SAME DAY</span>
        )}
        {job.status === "deposit_received" && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✓ DEPOSIT PAID</span>
        )}
        {isEnRoute && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">🚐 EN ROUTE</span>
        )}
        <span className="ml-auto text-teal-700 text-[10px] font-mono">{timeAgo(job.createdAt)}</span>
      </div>

      {(job.status === "pending" || job.status === "deposit_received") && !isMine && (
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
          {/* Contact row: Call + WhatsApp */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${job.phone}`}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-teal-900 font-black text-sm text-center transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-sm text-center transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
          {/* Maps navigate to pickup */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-bold text-sm transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" /> Navigate to Pickup
          </a>
          {/* Status actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {!isEnRoute && onEnRoute && (
              <button
                onClick={() => onEnRoute(job.id)}
                disabled={enRouting}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600/40 hover:bg-blue-600/60 border border-blue-500/40 text-blue-200 font-black text-xs transition-colors disabled:opacity-50"
              >
                {enRouting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Car className="w-3.5 h-3.5" />}
                En Route
              </button>
            )}
            {onComplete && (
              <button
                onClick={() => onComplete(job.id)}
                disabled={completing}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-black text-xs transition-colors disabled:opacity-50 ${
                  isEnRoute
                    ? "col-span-2 bg-amber-500 hover:bg-amber-400 border-amber-400 text-teal-900"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-teal-400"
                }`}
              >
                {completing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                Mark Completed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HistoryCard ────────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function DriverJobs() {
  const { data: auth } = useDriverAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [enRoutingId, setEnRoutingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"jobs" | "history">("jobs");
  const [availability, setAvailability] = useState<"available" | "offline">("offline");
  const [togglingAvail, setTogglingAvail] = useState(false);

  // Push notification state
  const [pushStatus, setPushStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");
  const [pushSub, setPushSub] = useState<PushSubscription | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

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

  // ── Init: check existing SW subscription + push permission ──────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }

    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub) {
          setPushSub(sub);
          setPushStatus("granted");
        } else if (Notification.permission === "denied") {
          setPushStatus("denied");
        }
        // else: stays "idle" → show Enable Alerts button
      })
      .catch(() => {
        // SW not yet active — stays idle so user can trigger it manually
      });
  }, []);

  // ── PWA install prompt ───────────────────────────────────────────────────────
  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault(); // suppress automatic mini-infobar
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstallPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
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

  const enRouteMutation = useMutation({
    mutationFn: (id: string) => doUpdateDriverStatus(id, "driver_en_route"),
    onSettled: (_, __, id) => {
      setEnRoutingId(null);
      qc.invalidateQueries({ queryKey: ["driver-jobs"] });
      qc.invalidateQueries({ queryKey: ["driver-jobs-history"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => doUpdateDriverStatus(id, "completed"),
    onSettled: (_, __, id) => {
      setCompletingId(null);
      qc.invalidateQueries({ queryKey: ["driver-jobs"] });
      qc.invalidateQueries({ queryKey: ["driver-jobs-history"] });
    },
  });

  function handleClaim(id: string) {
    setClaimingId(id); setClaimError(null);
    claimMutation.mutate(id);
  }

  function handleEnRoute(id: string) {
    setEnRoutingId(id);
    enRouteMutation.mutate(id);
  }

  function handleComplete(id: string) {
    setCompletingId(id);
    completeMutation.mutate(id);
  }

  async function handleToggleAvailability() {
    const next = availability === "available" ? "offline" : "available";
    setTogglingAvail(true);
    try { await doSetAvailability(next); setAvailability(next); } catch {}
    setTogglingAvail(false);
  }

  async function handleEnablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushError("Push notifications are not supported on this browser.");
      return;
    }
    setPushStatus("requesting");
    setPushError(null);

    try {
      // 1. Ensure SW is registered and active
      let reg: ServiceWorkerRegistration;
      try {
        reg = await ensureServiceWorker();
      } catch (e) {
        setPushStatus("idle");
        setPushError(`Service worker error: ${(e as Error).message}. Try reloading the page.`);
        return;
      }

      // 2. Request notification permission (must come from a user gesture)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        setPushError(
          permission === "denied"
            ? "Notifications blocked — enable them in your browser/phone settings then reload."
            : "Notification permission was dismissed. Tap Enable Alerts to try again."
        );
        return;
      }

      // 3. Fetch VAPID public key
      const vapidRes = await fetch("/api/drivers/push-key");
      if (!vapidRes.ok) {
        const body = await vapidRes.json().catch(() => ({})) as { error?: string };
        setPushStatus("idle");
        setPushError(body.error ?? "Push service is not configured. Contact your admin.");
        return;
      }
      const { publicKey } = await vapidRes.json() as { publicKey: string };

      // 4. Subscribe
      let sub: PushSubscription;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(publicKey),
        });
      } catch (e) {
        setPushStatus("idle");
        const msg = (e as Error).message ?? "";
        if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
          setPushStatus("denied");
          setPushError("Notifications are blocked. Check your browser settings.");
        } else {
          setPushError(`Subscription failed: ${msg}`);
        }
        return;
      }

      // 5. Save subscription to server
      const subJson = sub.toJSON();
      const saveRes = await fetch("/api/drivers/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });
      if (!saveRes.ok) {
        await sub.unsubscribe().catch(() => {});
        setPushStatus("idle");
        const body = await saveRes.json().catch(() => ({})) as { error?: string };
        setPushError(body.error ?? "Failed to save subscription. Please try again.");
        return;
      }

      setPushSub(sub);
      setPushStatus("granted");
    } catch (e) {
      setPushStatus("idle");
      setPushError(`Unexpected error: ${(e as Error).message ?? "Unknown"}`);
    }
  }

  async function handleDisablePush() {
    if (!pushSub) return;
    try {
      await pushSub.unsubscribe();
      await fetch("/api/drivers/push-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endpoint: pushSub.endpoint }),
      });
    } catch {}
    setPushSub(null);
    setPushStatus("idle");
    setPushError(null);
  }

  async function handleInstall() {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setInstallPrompt(null);
    } catch {}
    setInstalling(false);
  }

  // ── Sound alert: play a tone when new pending jobs appear ─────────────────
  const prevPendingCount = useRef<number | null>(null);
  useEffect(() => {
    const count = jobs.filter(j => j.status === "pending" || j.status === "deposit_received").length;
    if (prevPendingCount.current !== null && count > prevPendingCount.current) {
      playNewJobAlert();
    }
    prevPendingCount.current = count;
  }, [jobs]);

  async function handleLogout() {
    await doLogout();
    await qc.invalidateQueries({ queryKey: ["driver-auth"] });
    navigate("/driver/login");
  }

  const driverName = auth?.name ?? "";
  const pending = jobs.filter(j => j.status === "pending" || j.status === "deposit_received");
  const mine = jobs.filter(j => j.claimedBy === driverName && j.status !== "pending" && j.status !== "deposit_received");

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-TT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const historyCompleted = history.filter(j => j.status === "completed");
  const parsePrice = (price: string) => {
    const n = parseFloat(price.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const historyEarnings = historyCompleted.reduce((sum, j) => sum + parsePrice(j.price), 0);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekCompleted = historyCompleted.filter(j => new Date(j.updatedAt) >= weekAgo);
  const monthCompleted = historyCompleted.filter(j => new Date(j.updatedAt) >= monthStart);
  const weekEarnings = weekCompleted.reduce((sum, j) => sum + parsePrice(j.price), 0);
  const monthEarnings = monthCompleted.reduce((sum, j) => sum + parsePrice(j.price), 0);

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

      {/* Status bar: availability + push + install */}
      <div className="px-4 mb-1 flex items-center gap-2 flex-wrap">
        {/* Availability */}
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

        {/* Push toggle */}
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
        ) : pushStatus === "unsupported" ? null : (
          <button
            onClick={handleEnablePush}
            disabled={pushStatus === "requesting"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-teal-400 hover:border-amber-600/40 hover:text-amber-300 transition-all disabled:opacity-50"
          >
            {pushStatus === "requesting" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
            {pushStatus === "requesting" ? "Enabling…" : "Enable Alerts"}
          </button>
        )}

        {/* PWA install button — only shown when browser fires beforeinstallprompt */}
        {installPrompt && (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-800/60 border border-teal-500/50 text-teal-300 hover:bg-teal-700/60 transition-all disabled:opacity-50"
          >
            {installing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {installing ? "Installing…" : "Install App"}
          </button>
        )}
      </div>

      {/* Push error / hint feedback */}
      {pushError && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-red-900/30 border border-red-700/40 px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-xs leading-relaxed">{pushError}</p>
        </div>
      )}

      {/* iOS push hint: push only works when installed as PWA on iOS */}
      {pushStatus === "idle" && !installPrompt && /iphone|ipad|ipod/i.test(navigator.userAgent) && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-teal-900/30 border border-teal-700/30 px-3 py-2.5">
          <Bell className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
          <p className="text-teal-400 text-xs leading-relaxed">
            On iPhone/iPad: tap <span className="font-bold">Share → Add to Home Screen</span> first, then open from your home screen to enable alerts.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mb-4 mt-2">
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
                      onEnRoute={handleEnRoute}
                      onComplete={handleComplete}
                      enRouting={enRoutingId === job.id}
                      completing={completingId === job.id}
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
                <div className="mb-4 space-y-2">
                  {/* All-time summary */}
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-teal-400 text-[10px] uppercase tracking-wider font-semibold">All-Time Earnings</p>
                      <p className="text-amber-300 font-black text-xl">TT$ {historyEarnings.toFixed(0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-teal-400 text-[10px] uppercase tracking-wider font-semibold">Completed</p>
                      <p className="text-emerald-400 font-black text-xl">{historyCompleted.length}</p>
                    </div>
                  </div>
                  {/* This week / This month */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3 h-3 text-teal-400" />
                        <p className="text-teal-400 text-[10px] uppercase tracking-wider font-semibold">This Week</p>
                      </div>
                      <p className="text-amber-300 font-black text-base">TT$ {weekEarnings.toFixed(0)}</p>
                      <p className="text-teal-600 text-[10px]">{weekCompleted.length} job{weekCompleted.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3 text-teal-400" />
                        <p className="text-teal-400 text-[10px] uppercase tracking-wider font-semibold">This Month</p>
                      </div>
                      <p className="text-amber-300 font-black text-base">TT$ {monthEarnings.toFixed(0)}</p>
                      <p className="text-teal-600 text-[10px]">{monthCompleted.length} job{monthCompleted.length !== 1 ? "s" : ""}</p>
                    </div>
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
