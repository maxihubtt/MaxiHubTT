import { useState, useMemo, useCallback, useEffect } from "react";
import { useCreateJob, useGetJob, getGetJobQueryKey, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Navigation, User, Phone, CheckCircle2, Info, Loader2, Clock, Calendar, Users, ArrowLeftRight, Plane, Waves, Briefcase, Copy, Check, ChevronRight, ChevronLeft, MessageCircle, AlertTriangle } from "lucide-react";

const WA_BASE = "https://wa.me/18684818039?text=";
const waLink = (msg: string) => WA_BASE + encodeURIComponent(msg);

// ── Fare calculation helpers ─────────────────────────────────────────────────

function isWest(loc: string): boolean {
  return ["pos", "port of spain", "diego", "st james", "westmoorings", "chaguaramas", "maraval", "st clair", "woodbrook", "petit valley", "carenage", "west", "laventille", "morvant", "barataria", "san juan", "st joseph", "curepe", "valsayn", "mount lambert"].some(k => loc.includes(k));
}
function isCentral(loc: string): boolean {
  return ["chaguanas", "cunupia", "couva", "freeport", "brechin castle", "felicity", "longdenville", "charlieville", "central"].some(k => loc.includes(k));
}
function isEast(loc: string): boolean {
  return ["arima", "tunapuna", "arouca", "tacarigua", "sangre grande", "valencia", "grand bazaar", "trincity", "d'abadie", "malabar", "east", "toco", "matelot", "balandra", "saline", "demerara"].some(k => loc.includes(k));
}
function isSouth(loc: string): boolean {
  return ["san fernando", "penal", "siparia", "point fortin", "fyzabad", "cedros", "moruga", "princes town", "gasparillo", "marabella", "barrackpore", "rio claro", "south"].some(k => loc.includes(k));
}
function eastSubzone(loc: string): "near" | "mid" | "far" | "toco" {
  if (["toco", "matelot", "balandra", "saline"].some(k => loc.includes(k))) return "toco";
  if (["san juan", "st joseph", "curepe", "valsayn", "mount lambert", "barataria", "laventille", "morvant"].some(k => loc.includes(k))) return "near";
  if (["valencia", "demerara", "sangre grande"].some(k => loc.includes(k))) return "far";
  return "mid";
}
function southSubzone(loc: string): "close" | "mid" | "far" | "deep" {
  if (["cedros", "moruga"].some(k => loc.includes(k))) return "deep";
  if (["point fortin"].some(k => loc.includes(k))) return "far";
  if (["penal", "siparia", "fyzabad", "barrackpore", "princes town", "rio claro"].some(k => loc.includes(k))) return "mid";
  return "close";
}
type ZoneKey = "west" | "central" | "east" | "south";
function getZone(loc: string): ZoneKey | null {
  if (isSouth(loc)) return "south";
  if (isEast(loc)) return "east";
  if (isCentral(loc)) return "central";
  if (isWest(loc)) return "west";
  return null;
}
type BeachKey = "maracas" | "las_cuevas" | "blanchisseuse" | "manzanilla" | "mayaro" | "vessigny" | "icacos";
type RegionKey = "west" | "east" | "central" | "south";
const NORTH_COAST_BEACHES: BeachKey[] = ["maracas", "las_cuevas", "blanchisseuse"];
const BEACH_RATES: Record<BeachKey, Record<RegionKey, [number, number]>> = {
  maracas:       { west: [650, 1000],  east: [750, 1200],  central: [850, 1400],  south: [1200, 2000] },
  las_cuevas:    { west: [750, 1200],  east: [850, 1400],  central: [950, 1600],  south: [1300, 2200] },
  blanchisseuse: { west: [900, 1500],  east: [600, 1000],  central: [1100, 1800], south: [1600, 2600] },
  manzanilla:    { west: [1200, 2000], east: [600, 1000],  central: [900, 1500],  south: [900, 1500]  },
  mayaro:        { west: [1400, 2400], east: [800, 1400],  central: [1000, 1700], south: [650, 1100]  },
  vessigny:      { west: [1100, 1800], east: [1300, 2200], central: [800, 1400],  south: [500, 900]   },
  icacos:        { west: [1600, 2600], east: [1500, 2600], central: [1400, 2400], south: [800, 1400]  },
};
function identifyBeach(loc: string): BeachKey | null {
  if (loc.includes("maracas") || loc.includes("tyrico")) return "maracas";
  if (loc.includes("las cuevas")) return "las_cuevas";
  if (loc.includes("blanchisseuse") || loc.includes("paria")) return "blanchisseuse";
  if (loc.includes("manzanilla")) return "manzanilla";
  if (loc.includes("mayaro")) return "mayaro";
  if (loc.includes("vessigny")) return "vessigny";
  if (loc.includes("icacos") || loc.includes("columbus bay")) return "icacos";
  return null;
}
function identifyRegion(loc: string): RegionKey {
  if (isSouth(loc)) return "south";
  if (isEast(loc)) return "east";
  if (isCentral(loc)) return "central";
  return "west";
}
function paxSurcharge(pax: number): number {
  if (pax > 22) return 350;
  if (pax > 18) return 250;
  if (pax > 15) return 150;
  if (pax > 12) return 100;
  return 0;
}
function calculateFare(pickup: string, dropoff: string, tripType: string, pax: number): number {
  const p = pickup.toLowerCase();
  const d = dropoff.toLowerCase();
  const airportInvolved = d.includes("airport") || p.includes("airport");
  const beach = identifyBeach(d) ?? identifyBeach(p);
  if (beach !== null && !airportInvolved) {
    if (pax >= 16 && NORTH_COAST_BEACHES.includes(beach)) return pax * 100;
    const origin = identifyBeach(d) !== null ? p : d;
    const region = identifyRegion(origin);
    const [oneWayRate, roundRate] = BEACH_RATES[beach][region];
    return (tripType === "round" ? roundRate : oneWayRate) + paxSurcharge(pax);
  }
  if (airportInvolved) return 400 + paxSurcharge(pax);
  if (pax >= 16 && tripType === "round") return pax * 100;
  const pZone = getZone(p);
  const dZone = getZone(d);
  let base = 0;
  if ((pZone === "west" && dZone === "central") || (pZone === "central" && dZone === "west")) {
    base = tripType === "round" ? 900 : 550;
  } else if ((pZone === "west" && dZone === "east") || (pZone === "east" && dZone === "west")) {
    const sub = eastSubzone(pZone === "east" ? p : d);
    if (sub === "toco")   base = tripType === "round" ? 1500 : 950;
    else if (sub === "far") base = tripType === "round" ? 1000 : 625;
    else if (sub === "near") base = tripType === "round" ? 600 : 375;
    else                   base = tripType === "round" ? 800 : 500;
  } else if ((pZone === "west" && dZone === "south") || (pZone === "south" && dZone === "west")) {
    const sub = southSubzone(pZone === "south" ? p : d);
    if (sub === "deep")   base = tripType === "round" ? 1800 : 1150;
    else if (sub === "far") base = tripType === "round" ? 1500 : 900;
    else if (sub === "mid") base = tripType === "round" ? 1150 : 700;
    else                   base = tripType === "round" ? 900 : 500;
  } else if (
    (pZone === "central" && (dZone === "east" || dZone === "south")) ||
    ((pZone === "east" || pZone === "south") && dZone === "central") ||
    (pZone === "east" && dZone === "south") ||
    (pZone === "south" && dZone === "east")
  ) {
    base = tripType === "round" ? 1200 : 700;
  } else {
    base = tripType === "round" ? 600 : 400;
  }
  return base + paxSurcharge(pax);
}
function getMinDatetime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
}
function vehicleForPax(pax: number): string {
  if (pax <= 4)  return "Car / Small Van";
  if (pax <= 12) return "12-Seater Maxi";
  if (pax <= 15) return "15-Seater Maxi";
  if (pax <= 18) return "18-Seater Maxi";
  if (pax <= 22) return "22-Seater Maxi";
  return "24-Seater Maxi";
}
function paxLabel(pax: number): string {
  return `${pax} passenger${pax !== 1 ? "s" : ""} · 1 × ${vehicleForPax(pax)}`;
}
function fmtDt(dt: string) {
  return new Date(dt).toLocaleString("en-TT", {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Copy-to-clipboard booking reference ─────────────────────────────────────

function CopyableRef({ bookingId }: { bookingId: string }) {
  const [copied, setCopied] = useState(false);

  // Auto-copy on mount so the ref is already in clipboard when they arrive
  useEffect(() => {
    navigator.clipboard.writeText(bookingId).then(() => {
      setCopied(true);
    }).catch(() => {});
  }, [bookingId]);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(bookingId).catch(() => {});
    setCopied(true);
  }, [bookingId]);

  return (
    <div className="space-y-2">
      {/* Urgent save warning */}
      <div className="flex items-start gap-2 rounded-xl border-2 border-amber-400 bg-amber-400/15 px-3 py-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-amber-300 leading-snug">
          Save this reference — it's the <span className="underline underline-offset-2">only</span> way to track your booking once you leave this screen.
        </p>
      </div>

      {/* Tappable ref block */}
      <button
        onClick={copy}
        className="w-full rounded-2xl border-2 border-dashed border-amber-400/60 bg-amber-400/10 px-4 py-5 flex flex-col items-center gap-1 active:scale-[0.97] transition-transform"
        aria-label="Copy booking reference"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Booking Reference</p>
        <p className="text-5xl font-black font-mono tracking-widest text-amber-400 leading-none mt-1">{bookingId}</p>
        <div className={`flex items-center gap-1.5 mt-2 text-sm font-bold transition-colors ${copied ? "text-green-400" : "text-amber-300/70"}`}>
          {copied ? <><Check className="w-4 h-4" /> Copied to clipboard!</> : <><Copy className="w-4 h-4" /> Tap to copy</>}
        </div>
      </button>

      <p className="text-center text-xs text-teal-500">
        Use this at the "Track Your Booking" section on the home page
      </p>
    </div>
  );
}

// ── Live status badge on confirmation ────────────────────────────────────────

function LiveStatusBadge({ jobId }: { jobId: string }) {
  const { data: job } = useGetJob(jobId, {
    query: { queryKey: getGetJobQueryKey(jobId), enabled: !!jobId, refetchInterval: 5000 },
  });

  const status = job?.status ?? "pending";
  const configs: Record<string, { label: string; color: string; dot: string }> = {
    pending:   { label: "Awaiting Driver",  color: "text-amber-700 bg-amber-50 border-amber-200",  dot: "bg-amber-400 animate-pulse" },
    claimed:   { label: "Driver Assigned",  color: "text-teal-700 bg-teal-50 border-teal-200",     dot: "bg-teal-500" },
    completed: { label: "Completed",        color: "text-gray-600 bg-gray-50 border-gray-300",     dot: "bg-gray-400" },
  };
  const cfg = configs[status] ?? configs.pending;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Booking tracker lookup ───────────────────────────────────────────────────

function BookingLookup() {
  const [refInput, setRefInput] = useState("");
  const [searchId, setSearchId] = useState("");
  const { data: job, isLoading, isError } = useGetJob(searchId, {
    query: { queryKey: getGetJobQueryKey(searchId), enabled: !!searchId },
  });

  return (
    <section className="py-16 px-6 md:px-12 bg-white/60">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
          <h2 className="text-3xl font-black text-teal-900 mb-2">Track Your Booking</h2>
          <p className="text-teal-700/70 text-sm">Enter your booking reference to check the status of your ride.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. M1234"
            value={refInput}
            onChange={e => setRefInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && setSearchId(refInput.trim())}
            className="flex-1 h-12 px-4 rounded-xl border-2 border-teal-100 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm font-mono tracking-widest"
          />
          <button
            onClick={() => setSearchId(refInput.trim())}
            disabled={!refInput.trim() || isLoading}
            className="h-12 px-6 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Look Up"}
          </button>
        </div>
        {searchId && !isLoading && isError && (
          <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 text-center">
            No booking found for <strong>{searchId}</strong>. Please check your reference and try again.
          </div>
        )}
        {job && (
          <div className="mt-6 rounded-2xl border border-teal-100 bg-white shadow-md overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126, #f59e0b, #0f3d2e)" }} />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-teal-500 tracking-widest">Ref: {job.id}</span>
                <LiveStatusBadge jobId={job.id} />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2 items-start">
                  <MapPin className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-teal-500 uppercase tracking-wider">Pickup</p><p className="font-semibold text-teal-900">{job.pickup}</p></div>
                </div>
                <div className="flex gap-2 items-start">
                  <Navigation className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-teal-500 uppercase tracking-wider">Dropoff</p><p className="font-semibold text-teal-900">{job.dropoff}</p></div>
                </div>
              </div>
              {job.status === "claimed" && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Driver Assigned</p>
                  </div>
                  {job.claimedBy && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-teal-400 uppercase tracking-wider mb-0.5">Driver</p><p className="font-bold text-teal-900">{job.claimedBy}</p></div>
                      {job.vehicleType && <div><p className="text-teal-400 uppercase tracking-wider mb-0.5">Vehicle</p><p className="font-bold text-teal-900">{job.vehicleType}</p></div>}
                    </div>
                  )}
                </div>
              )}
              {job.status === "pending" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-teal-700">Your booking is waiting to be claimed by a driver. You'll be contacted shortly.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Route", "Details", "You", "Confirm"];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="px-6 pt-6 pb-2">
      <div className="flex items-center gap-1 mb-3">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full h-1.5 rounded-full transition-all duration-400 ${
              i < step ? "bg-teal-600" : i === step ? "bg-amber-400" : "bg-teal-100"
            }`} />
            <span className={`text-[10px] font-bold uppercase tracking-wide transition-colors ${
              i === step ? "text-amber-600" : i < step ? "text-teal-600" : "text-teal-300"
            }`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Confirmed screen ─────────────────────────────────────────────────────────

function ConfirmedScreen({
  job,
  onReset,
}: {
  job: { id: string; name: string; pickup: string; dropoff: string; deposit: number; fare: number; pickupDatetime: string; returnDatetime: string; tripType: string };
  onReset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-8 pb-16 px-4"
      style={{ fontFamily: "'Outfit', sans-serif", background: "linear-gradient(160deg, #0a2e21 0%, #0f3d2e 50%, #1a5c42 100%)" }}
    >
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="relative overflow-hidden rounded-full shadow-xl" style={{ width: 72, height: 72 }}>
          <img
            src="/logo-raw.png"
            alt="Maxi Hub TT"
            style={{ width: 72, height: 103, objectFit: "cover", objectPosition: "top center" }}
          />
        </div>
        <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">Maxi Hub TT</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Success checkmark */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-400/20 border-2 border-green-400/40 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Booking Confirmed!</h2>
          <p className="text-teal-300 text-sm mt-1">
            Hey <strong className="text-white">{job.name.split(" ")[0]}</strong>, you're all set.
          </p>
        </div>

        {/* Live status */}
        <div className="flex justify-center mb-5">
          <LiveStatusBadge jobId={job.id} />
        </div>

        {/* BOOKING REFERENCE — tap to copy */}
        <CopyableRef bookingId={job.id} />

        {/* Trip summary */}
        <div className="mt-4 rounded-2xl bg-white/10 border border-white/15 p-4 space-y-3">
          <div className="flex gap-3 items-start">
            <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-teal-400 text-xs uppercase tracking-wider">Pickup</p>
              <p className="text-white font-semibold text-sm">{job.pickup}</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Navigation className="w-4 h-4 text-teal-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-teal-400 text-xs uppercase tracking-wider">Dropoff</p>
              <p className="text-white font-semibold text-sm">{job.dropoff}</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Calendar className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-teal-400 text-xs uppercase tracking-wider">
                {job.tripType === "round" ? "Outbound" : "Pickup"} Date & Time
              </p>
              <p className="text-white font-semibold text-sm">{fmtDt(job.pickupDatetime)}</p>
              {job.tripType === "round" && job.returnDatetime && (
                <>
                  <p className="text-teal-400 text-xs uppercase tracking-wider mt-2">Return</p>
                  <p className="text-white font-semibold text-sm">{fmtDt(job.returnDatetime)}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Deposit callout */}
        <div className="mt-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 px-4 py-4">
          <p className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-1">Deposit Due to Confirm</p>
          <p className="text-amber-400 text-4xl font-black leading-none">TTD {job.deposit}</p>
          <p className="text-teal-400 text-xs mt-2 leading-relaxed">
            Total fare: <strong className="text-white">TTD {job.fare}</strong> &mdash; balance of TTD {job.fare - job.deposit} paid to your driver on the day.
          </p>
        </div>

        {/* Contact note */}
        <div className="mt-4 flex gap-3 items-start bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <Info className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
          <p className="text-teal-300 text-xs leading-relaxed">
            Our team will contact you shortly to collect the deposit and confirm your driver.
          </p>
        </div>

        <button
          onClick={onReset}
          className="mt-6 w-full h-12 rounded-xl text-sm font-black text-teal-900 transition-all active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          Book Another Ride
        </button>
      </div>
    </div>
  );
}

// ── Main home page ────────────────────────────────────────────────────────────

export default function Home() {
  const [step, setStep] = useState(0);

  // Step 0 — Route
  const [pickup, setPickup]   = useState("");
  const [dropoff, setDropoff] = useState("");

  // Step 1 — Details
  const [tripType, setTripType]               = useState<"one-way" | "round" | null>(null);
  const [pax, setPax]                         = useState(1);
  const [pickupDatetime, setPickupDatetime]   = useState("");
  const [returnDatetime, setReturnDatetime]   = useState("");
  const [datetimeError, setDatetimeError]     = useState("");
  const [returnDatetimeError, setReturnDatetimeError] = useState("");

  // Step 2 — Contact
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");

  // Booking result
  const [bookedJob, setBookedJob] = useState<{
    id: string; name: string; pickup: string; dropoff: string;
    deposit: number; fare: number; pickupDatetime: string; returnDatetime: string; tripType: string;
  } | null>(null);

  const [stepErrors, setStepErrors] = useState(false);

  const queryClient = useQueryClient();
  const createJob   = useCreateJob();

  const fare     = useMemo(() => tripType ? calculateFare(pickup, dropoff, tripType, pax) : 0, [pickup, dropoff, tripType, pax]);
  const deposit  = fare > 0 ? Math.ceil(fare * 0.25) : 0;
  const fareCeil = fare > 0 ? Math.ceil(fare) : 0;

  const validateDatetime = (value: string) => {
    if (!value) { setDatetimeError(""); return; }
    const selected = new Date(value);
    const minTime  = new Date();
    minTime.setHours(minTime.getHours() + 1);
    setDatetimeError(selected < minTime ? "Pickup must be at least 1 hour from now." : "");
  };

  const validateReturnDatetime = (pickup: string, ret: string) => {
    if (!ret) { setReturnDatetimeError(""); return; }
    if (!pickup) { setReturnDatetimeError("Set a pickup time first."); return; }
    setReturnDatetimeError(new Date(ret) <= new Date(pickup) ? "Return must be after pickup." : "");
  };

  // Step-by-step validation
  const canAdvanceStep0 = pickup.trim() !== "" && dropoff.trim() !== "";
  const canAdvanceStep1 =
    tripType !== null &&
    pickupDatetime !== "" &&
    !datetimeError &&
    (tripType !== "round" || (returnDatetime !== "" && !returnDatetimeError));
  const canAdvanceStep2 = name.trim() !== "" && phone.trim() !== "";
  const isReadyToSubmit = canAdvanceStep0 && canAdvanceStep1 && canAdvanceStep2;

  function goNext() {
    setStepErrors(false);
    if (step === 0 && !canAdvanceStep0) { setStepErrors(true); return; }
    if (step === 1 && !canAdvanceStep1) { setStepErrors(true); return; }
    if (step === 2 && !canAdvanceStep2) { setStepErrors(true); return; }
    setStep(s => Math.min(s + 1, 3));
  }
  function goBack() { setStep(s => Math.max(s - 1, 0)); setStepErrors(false); }

  function handleSubmit() {
    if (!isReadyToSubmit || !tripType) { setStepErrors(true); return; }
    const tripLabel = tripType === "round" ? "Round Trip" : "One Way";
    const passengerDesc = paxLabel(pax);
    const returnNote = tripType === "round" && returnDatetime ? ` | Return: ${returnDatetime}` : "";
    const priceNote = `TTD ${fareCeil} (${tripLabel}, ${passengerDesc}) — Pickup: ${pickupDatetime}${returnNote}`;

    createJob.mutate(
      { data: { pickup, dropoff, name, phone, price: priceNote, passengers: passengerDesc } },
      {
        onSuccess: job => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
          setBookedJob({ id: job.id, name, pickup, dropoff, deposit, fare: fareCeil, pickupDatetime, returnDatetime, tripType });
        },
      }
    );
  }

  function resetAll() {
    setStep(0);
    setPickup(""); setDropoff("");
    setTripType(null); setPax(1);
    setPickupDatetime(""); setReturnDatetime(""); setDatetimeError(""); setReturnDatetimeError("");
    setName(""); setPhone("");
    setBookedJob(null);
    setStepErrors(false);
  }

  if (bookedJob) {
    return <ConfirmedScreen job={bookedJob} onReset={resetAll} />;
  }

  return (
    <div className="min-h-screen bg-[#FFFBF4] text-teal-950" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{ background: "linear-gradient(90deg, #0f3d2e 0%, #1a5c42 60%, #0f3d2e 100%)" }} className="text-amber-50 shadow-lg">
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ce1126 0%, #000 40%, #ce1126 100%)" }} />
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo image — bottom cropped to remove plate & WhatsApp text */}
            <div className="relative overflow-hidden rounded-full shadow-lg shrink-0" style={{ width: 52, height: 52 }}>
              <img
                src="/logo-raw.png"
                alt="Maxi Hub TT logo"
                style={{ width: 52, height: 78, objectFit: "cover", objectPosition: "top center" }}
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Maxi Hub TT</h1>
              <p className="text-xs text-amber-300 font-medium tracking-widest uppercase">Premium Shuttle Service</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-teal-100">
            <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">Trinidad & Tobago</span>
            <span className="mx-2 text-amber-400">✦</span>
            <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">Private Hire</span>
            <span className="mx-2 text-amber-400">✦</span>
            <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">Airport Runs</span>
          </div>
          <a
            href={waLink("Hi Maxi Hub TT, I'd like to enquire about booking a ride.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
        <div className="border-t border-white/10 py-2 text-center" style={{ background: "rgba(0,0,0,0.15)" }}>
          <p className="text-xs text-amber-200 font-medium tracking-widest uppercase">🌴 &nbsp; Safe. Smooth. On Time. That's How We Roll. &nbsp; 🌴</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-12 pb-20">

        {/* Left Column: Hero */}
        <div className="relative">
          <div className="h-[30vh] lg:h-full w-full overflow-hidden relative">
            <img
              src="/maxi-hero.png"
              alt="Maxi taxi in Trinidad"
              className="w-full h-full object-cover object-center absolute inset-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#FFFBF4] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#FFFBF4]" />
          </div>

          <div className="absolute bottom-0 lg:bottom-auto lg:top-1/4 left-0 w-full lg:w-11/12 p-6 lg:p-12 z-10">
            <div className="bg-[#FFFBF4]/85 backdrop-blur-md p-6 lg:p-8 rounded-2xl shadow-2xl border border-white/50 inline-block">
              {/* T&T flag accent */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-8 rounded-full" style={{ background: "#ce1126" }} />
                <div className="h-1 w-8 rounded-full bg-black" />
                <div className="h-1 w-8 rounded-full" style={{ background: "#ce1126" }} />
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-teal-900 leading-tight mb-3">
                Your reliable ride <br />
                <span style={{ color: "#c8861a" }}>across the island.</span>
              </h2>
              <p className="text-teal-800/80 text-base max-w-md mb-4">
                Premium private hire for individuals, groups, airport runs, beach trips & events. No haggling — transparent rates, real reliability.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Airport Runs", "Beach Limes", "Group Events", "Corporate"].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-900/10 text-teal-800 border border-teal-200">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Step-by-step booking */}
        <div className="p-6 md:p-12 lg:py-10 flex items-start justify-center z-10 relative">
          <div className="w-full max-w-lg bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-amber-900/5 border border-amber-100 overflow-hidden">
            <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126, #f59e0b, #0f3d2e)" }} />

            <ProgressBar step={step} />

            <div className="px-6 pb-6">

              {/* ── STEP 0: Route ── */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-teal-900">Where are you going?</h2>
                    <p className="text-teal-700/70 text-sm mt-1">Enter your pickup and dropoff locations to get an instant fare estimate.</p>
                  </div>

                  <div className="space-y-3">
                    {/* Pickup */}
                    <div className="space-y-1.5">
                      <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                        <div className="bg-amber-100 p-1 rounded-full"><MapPin className="w-3.5 h-3.5 text-amber-600" /></div>
                        Pickup Location
                      </label>
                      <input
                        type="text"
                        data-testid="input-pickup"
                        placeholder="e.g. Maracas Bay, POS, Piarco Airport..."
                        className={`w-full h-12 px-4 rounded-xl border-2 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm transition-colors ${stepErrors && !pickup.trim() ? "border-red-400" : "border-teal-100"}`}
                        value={pickup}
                        onChange={e => { setPickup(e.target.value); setStepErrors(false); }}
                      />
                      {stepErrors && !pickup.trim() && <p className="text-xs text-red-600 font-medium">Please enter a pickup location.</p>}
                    </div>

                    {/* Dropoff */}
                    <div className="space-y-1.5">
                      <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                        <div className="bg-teal-100 p-1 rounded-full"><Navigation className="w-3.5 h-3.5 text-teal-600" /></div>
                        Dropoff Location
                      </label>
                      <input
                        type="text"
                        data-testid="input-dropoff"
                        placeholder="e.g. San Fernando, Chaguanas, Las Cuevas..."
                        className={`w-full h-12 px-4 rounded-xl border-2 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm transition-colors ${stepErrors && !dropoff.trim() ? "border-red-400" : "border-teal-100"}`}
                        value={dropoff}
                        onChange={e => { setDropoff(e.target.value); setStepErrors(false); }}
                      />
                      {stepErrors && !dropoff.trim() && <p className="text-xs text-red-600 font-medium">Please enter a dropoff location.</p>}
                    </div>
                  </div>

                  {/* Live fare preview */}
                  {pickup.trim() && dropoff.trim() && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-teal-700">
                      <p className="text-xs text-teal-500 uppercase tracking-wider mb-1 font-bold">Estimated Fare</p>
                      {fare > 0
                        ? <p className="text-2xl font-black text-teal-900">TTD {Math.ceil(fare)} <span className="text-sm font-normal text-teal-600">one way, 1 pax</span></p>
                        : <p className="text-sm text-teal-600">Enter specific areas (e.g. Port of Spain, San Fernando) for a fare estimate.</p>}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 1: Trip Details ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-teal-900">Trip details</h2>
                    <p className="text-teal-700/70 text-sm mt-1">Tell us about your journey so we can match the right vehicle.</p>
                  </div>

                  {/* Trip type */}
                  <div className="space-y-2">
                    <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600" />
                      Trip Type
                    </label>
                    <div className={`grid grid-cols-2 gap-2 ${stepErrors && !tripType ? "ring-2 ring-red-400 rounded-xl p-1" : ""}`}>
                      {(["one-way", "round"] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { setTripType(type); if (type === "one-way") { setReturnDatetime(""); setReturnDatetimeError(""); } setStepErrors(false); }}
                          className={`h-12 rounded-xl border-2 text-sm font-bold transition-all ${
                            tripType === type
                              ? "border-teal-600 bg-teal-600 text-white"
                              : "border-dashed border-teal-200 bg-white text-teal-600 hover:border-teal-400"
                          }`}
                        >
                          {type === "one-way" ? "One Way" : "Round Trip"}
                        </button>
                      ))}
                    </div>
                    {stepErrors && !tripType && <p className="text-xs text-red-600 font-medium">Please select a trip type.</p>}
                  </div>

                  {/* Passengers */}
                  <div className="space-y-2">
                    <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                      <Users className="w-3.5 h-3.5 text-teal-600" />
                      Passengers
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border-2 border-teal-100 bg-white px-4 h-12">
                      <button type="button" onClick={() => setPax(p => Math.max(1, p - 1))}
                        className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xl flex items-center justify-center hover:bg-teal-100 transition-colors shrink-0">−</button>
                      <span className="flex-1 text-center text-teal-900 font-black text-lg tabular-nums">{pax}</span>
                      <button type="button" onClick={() => setPax(p => Math.min(24, p + 1))}
                        className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xl flex items-center justify-center hover:bg-teal-100 transition-colors shrink-0">+</button>
                    </div>
                    <p className="text-xs text-teal-600/80 font-medium px-1">1 × {vehicleForPax(pax)}</p>
                  </div>

                  {/* Pickup datetime */}
                  <div className="space-y-1.5">
                    <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      Pickup Date & Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600/40 pointer-events-none" />
                      <input
                        data-testid="input-datetime"
                        type="datetime-local"
                        min={getMinDatetime()}
                        className={`w-full h-12 pl-9 pr-4 rounded-xl border-2 bg-white focus:outline-none text-teal-900 text-sm transition-colors ${
                          (stepErrors && !pickupDatetime) || datetimeError ? "border-red-400" : "border-teal-100 focus:border-teal-500"
                        }`}
                        value={pickupDatetime}
                        onChange={e => { setPickupDatetime(e.target.value); validateDatetime(e.target.value); setStepErrors(false); }}
                      />
                    </div>
                    {datetimeError && <p className="text-xs text-red-600 font-medium">{datetimeError}</p>}
                    {stepErrors && !pickupDatetime && !datetimeError && <p className="text-xs text-red-600 font-medium">Please set a pickup date and time.</p>}
                  </div>

                  {/* Return datetime */}
                  {tripType === "round" && (
                    <div className="space-y-1.5">
                      <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        Return Date & Time
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50 pointer-events-none" />
                        <input
                          data-testid="input-return-datetime"
                          type="datetime-local"
                          min={pickupDatetime || getMinDatetime()}
                          className={`w-full h-12 pl-9 pr-4 rounded-xl border-2 bg-white focus:outline-none text-teal-900 text-sm transition-colors ${
                            returnDatetimeError || (stepErrors && !returnDatetime) ? "border-red-400" : "border-amber-200 focus:border-amber-400"
                          }`}
                          value={returnDatetime}
                          onChange={e => { setReturnDatetime(e.target.value); validateReturnDatetime(pickupDatetime, e.target.value); setStepErrors(false); }}
                        />
                      </div>
                      {returnDatetimeError && <p className="text-xs text-red-600 font-medium">{returnDatetimeError}</p>}
                      {stepErrors && !returnDatetime && !returnDatetimeError && <p className="text-xs text-red-600 font-medium">Please set a return date and time.</p>}
                    </div>
                  )}

                  {/* Running fare */}
                  {fare > 0 && tripType && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-teal-500 uppercase tracking-wider font-bold">Estimated Fare</p>
                          <p className="text-xs text-teal-600">{tripType === "round" ? "Round trip" : "One way"} · {paxLabel(pax)}</p>
                        </div>
                        <p className="text-2xl font-black text-teal-900">TTD {fareCeil}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: Contact ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-teal-900">Your details</h2>
                    <p className="text-teal-700/70 text-sm mt-1">We'll use these to confirm your booking and reach you with updates.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-teal-900 font-semibold text-sm flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      Your Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        data-testid="input-name"
                        placeholder="e.g. Kezia Charles"
                        className={`w-full h-12 px-4 rounded-xl border-2 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm transition-colors ${stepErrors && !name.trim() ? "border-red-400" : "border-teal-100"}`}
                        value={name}
                        onChange={e => { setName(e.target.value); setStepErrors(false); }}
                      />
                    </div>
                    {stepErrors && !name.trim() && <p className="text-xs text-red-600 font-medium">Please enter your name.</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-teal-900 font-semibold text-sm flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-teal-600" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      data-testid="input-phone"
                      placeholder="868-XXX-XXXX"
                      className={`w-full h-12 px-4 rounded-xl border-2 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm transition-colors ${stepErrors && !phone.trim() ? "border-red-400" : "border-teal-100"}`}
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setStepErrors(false); }}
                    />
                    {stepErrors && !phone.trim() && <p className="text-xs text-red-600 font-medium">Please enter your phone number.</p>}
                  </div>

                  <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex gap-3 items-start">
                    <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-teal-700 leading-relaxed">
                      We'll contact you on this number to collect your deposit and confirm your driver. Keep your phone nearby.
                    </p>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Review & Confirm ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-black text-teal-900">Review your booking</h2>
                    <p className="text-teal-700/70 text-sm mt-1">Everything look right? Hit confirm to lock in your ride.</p>
                  </div>

                  {/* Summary */}
                  <div className="rounded-2xl border border-teal-100 bg-teal-50/50 divide-y divide-teal-100 text-sm overflow-hidden">
                    <div className="px-4 py-3 flex gap-3 items-start">
                      <MapPin className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-teal-500 uppercase tracking-wider">Route</p>
                        <p className="font-semibold text-teal-900">{pickup} → {dropoff}</p>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex gap-3 items-start">
                      <ArrowLeftRight className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-teal-500 uppercase tracking-wider">Trip</p>
                        <p className="font-semibold text-teal-900">{tripType === "round" ? "Round Trip" : "One Way"} · {pax} passenger{pax !== 1 ? "s" : ""} · {vehicleForPax(pax)}</p>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex gap-3 items-start">
                      <Calendar className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-teal-500 uppercase tracking-wider">Pickup</p>
                        <p className="font-semibold text-teal-900">{pickupDatetime ? fmtDt(pickupDatetime) : "—"}</p>
                        {tripType === "round" && returnDatetime && (
                          <>
                            <p className="text-xs text-teal-500 uppercase tracking-wider mt-2">Return</p>
                            <p className="font-semibold text-teal-900">{fmtDt(returnDatetime)}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3 flex gap-3 items-start">
                      <User className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-teal-500 uppercase tracking-wider">Contact</p>
                        <p className="font-semibold text-teal-900">{name} · {phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fare */}
                  {fare > 0 && (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold text-teal-800">Estimated Fare</p>
                          <p className="text-xs text-teal-600">{tripType === "round" ? "Round trip" : "One way"} · {paxLabel(pax)}</p>
                        </div>
                        <p className="text-3xl font-black text-teal-900">TTD {fareCeil}</p>
                      </div>
                      <div className="bg-white/70 border border-amber-100 rounded-xl px-3 py-2.5 flex gap-3 items-start">
                        <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-teal-900">25% Deposit: TTD {deposit}</p>
                          <p className="text-xs text-teal-700/80 mt-0.5">Balance of TTD {fareCeil - deposit} paid to your driver on the day.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {createJob.isError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                      Something went wrong. Please try again.
                    </p>
                  )}

                  <button
                    data-testid="button-book"
                    disabled={createJob.isPending}
                    onClick={handleSubmit}
                    className="w-full h-14 rounded-xl text-white font-black text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}
                  >
                    {createJob.isPending
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirming...</>
                      : fare > 0
                      ? <><CheckCircle2 className="w-5 h-5" /> Confirm Booking &mdash; TTD {deposit} deposit</>
                      : "Confirm Booking"}
                  </button>
                </div>
              )}

              {/* ── Navigation buttons ── */}
              <div className={`flex gap-3 mt-6 ${step === 0 ? "justify-end" : "justify-between"}`}>
                {step > 0 && (
                  <button
                    onClick={goBack}
                    className="flex items-center gap-1.5 h-11 px-5 rounded-xl border-2 border-teal-100 bg-white text-teal-700 font-bold text-sm hover:border-teal-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                {step < 3 && (
                  <button
                    onClick={goNext}
                    className="flex items-center gap-1.5 h-11 px-6 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ── How it works ── */}
      <section className="py-14 px-6 md:px-12" style={{ background: "linear-gradient(135deg, #0f3d2e 0%, #0a2e21 100%)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Simple Process</p>
            <h2 className="text-3xl font-black text-white">Book in under 2 minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* connector line desktop */}
            <div className="hidden md:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-0.5 bg-amber-400/30" />
            {[
              { num: "1", title: "Enter your route", desc: "Type your pickup and dropoff — we'll calculate an instant fare for your journey.", icon: <MapPin className="w-5 h-5" /> },
              { num: "2", title: "Confirm & deposit", desc: "Pay just 25% upfront to secure your booking. Balance is paid to the driver on the day.", icon: <CheckCircle2 className="w-5 h-5" /> },
              { num: "3", title: "Driver picks you up", desc: "A driver claims your job and contacts you directly. Track the status in real time.", icon: <Navigation className="w-5 h-5" /> },
            ].map(({ num, title, desc, icon }) => (
              <div key={num} className="flex flex-col items-center text-center relative z-10">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg text-teal-900 font-black text-xl"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                >
                  {num}
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-800/50 border border-teal-700 flex items-center justify-center text-amber-400 mb-3">
                  {icon}
                </div>
                <h3 className="text-white font-black text-base mb-2">{title}</h3>
                <p className="text-teal-300 text-sm leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="px-8 py-3.5 rounded-xl font-black text-teal-900 text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              Book My Ride →
            </button>
          </div>
        </div>
      </section>

      {/* ── Services section ── */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
            <h2 className="text-3xl font-black text-teal-900 mb-2">What We Do</h2>
            <p className="text-teal-700/70 text-sm">Premium private hire for every occasion across Trinidad & Tobago.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { icon: <Plane className="w-6 h-6" />, title: "Airport Runs",    desc: "Stress-free transfers to and from Piarco. On time, every time — fixed fares, no haggling.",              color: "bg-sky-50 border-sky-100 text-sky-700",       iconBg: "bg-sky-100 text-sky-600",       wa: "Hi Maxi Hub TT, I'd like to book an airport run." },
              { icon: <Waves className="w-6 h-6" />, title: "Beach Limes",     desc: "Maracas, Las Cuevas, Mayaro, Icacos and more. We know the routes. You focus on the vibes.",                        color: "bg-teal-50 border-teal-100 text-teal-700",    iconBg: "bg-teal-100 text-teal-600",    wa: "Hi Maxi Hub TT, I'd like to book a beach trip." },
              { icon: <Users className="w-6 h-6" />, title: "Group Events",    desc: "Family reunions, fetes, school trips, sporting events. One call, one maxi, everyone rides together.",              color: "bg-amber-50 border-amber-100 text-amber-700", iconBg: "bg-amber-100 text-amber-600",  wa: "Hi Maxi Hub TT, I'd like to book a group event ride." },
              { icon: <Briefcase className="w-6 h-6" />, title: "Corporate Hire", desc: "Professional, punctual, and presentable. We move your team so you can focus on business.",                    color: "bg-slate-50 border-slate-100 text-slate-700", iconBg: "bg-slate-100 text-slate-600",  wa: "Hi Maxi Hub TT, I'd like to enquire about corporate hire." },
            ].map(({ icon, title, desc, color, iconBg, wa }) => (
              <div key={title} className={`rounded-2xl border p-6 flex gap-4 items-start ${color}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
                <div className="flex-1">
                  <h3 className="font-black text-teal-900 text-base mb-1">{title}</h3>
                  <p className="text-sm leading-relaxed text-teal-800/70">{desc}</p>
                  <a
                    href={waLink(wa)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp Us →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fleet / events banner ── */}
      <section className="py-10 px-6 md:px-12 bg-teal-900">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">Special Events & Corporate</p>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">Need a fleet for your event?</h2>
            <p className="text-teal-300 text-sm mt-2 max-w-md">
              Weddings, school trips, fetes, corporate outings — we coordinate multiple vehicles so your whole crew travels together.
            </p>
          </div>
          <a
            href={waLink("Hi Maxi Hub TT, I'd like to discuss booking a fleet of vehicles for my event.")}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-8 py-4 rounded-xl font-black text-teal-900 text-sm shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Us →
          </a>
        </div>
      </section>

      {/* ── Booking tracker lookup ── */}
      <BookingLookup />

      {/* ── Floating WhatsApp button ── */}
      <a
        href={waLink("Hi Maxi Hub TT, I'd like to enquire about booking a ride.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-4 z-[9000] flex items-center gap-2 pl-3 pr-4 h-13 rounded-full shadow-2xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
        style={{ background: "#25D366", height: 52 }}
      >
        <MessageCircle className="w-5 h-5 shrink-0" />
        <span>Chat with us</span>
      </a>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 text-center border-t border-teal-100 bg-[#FFFBF4]">
        <div className="flex justify-center items-center gap-3 mb-3">
          <div className="relative overflow-hidden rounded-full" style={{ width: 36, height: 36 }}>
            <img src="/logo-raw.png" alt="Maxi Hub TT" style={{ width: 36, height: 51, objectFit: "cover", objectPosition: "top center" }} />
          </div>
          <p className="font-black text-teal-900 text-sm">Maxi Hub TT</p>
        </div>
        <p className="text-xs text-teal-600/60 mb-1">Comfort. Reliability. Every Ride.</p>
        <p className="text-xs text-teal-600/40">© {new Date().getFullYear()} Maxi Hub TT. All rights reserved. Trinidad & Tobago.</p>
      </footer>

    </div>
  );
}
