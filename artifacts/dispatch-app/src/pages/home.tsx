import { useState, useMemo } from "react";
import { useCreateJob, useGetJob, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, User, Phone, CheckCircle2, Info, Loader2, Clock, Calendar, Users, ArrowLeftRight, MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/18684818039?text=Hi%20Maxi%20Hub%20TT%2C%20I%20would%20like%20to%20book%20a%20ride.";

function isWest(loc: string): boolean {
  return ["pos", "port of spain", "diego", "st james", "westmoorings", "chaguaramas", "maraval", "st clair", "woodbrook", "petit valley", "carenage", "west"].some(k => loc.includes(k));
}

function isCentral(loc: string): boolean {
  return ["chaguanas", "cunupia", "couva", "freeport", "brechin castle", "felicity", "longdenville", "charlieville", "central"].some(k => loc.includes(k));
}

function isEast(loc: string): boolean {
  return ["arima", "tunapuna", "arouca", "tacarigua", "sangre grande", "valencia", "grand bazaar", "trincity", "d'abadie", "malabar", "east"].some(k => loc.includes(k));
}

function isSouth(loc: string): boolean {
  return ["san fernando", "penal", "siparia", "point fortin", "fyzabad", "cedros", "moruga", "princes town", "gasparillo", "marabella", "south"].some(k => loc.includes(k));
}

function southDepth(loc: string): number {
  if (["point fortin", "cedros", "fyzabad", "moruga", "siparia"].some(k => loc.includes(k))) return 3;
  if (["penal", "princes town", "gasparillo"].some(k => loc.includes(k))) return 2;
  if (["san fernando", "marabella"].some(k => loc.includes(k))) return 1;
  return 1;
}

type BeachKey = "maracas" | "las_cuevas" | "blanchisseuse" | "manzanilla" | "mayaro" | "vessigny" | "icacos";
type RegionKey = "west" | "east" | "central" | "south";

// North coast beaches (18+ pax → $100/person rule applies)
const NORTH_COAST_BEACHES: BeachKey[] = ["maracas", "las_cuevas", "blanchisseuse"];

// Full pricing matrix: [one-way, round-trip] per beach per region
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
  if (loc.includes("las cuevas") || loc.includes("toco") || loc.includes("matelot")) return "las_cuevas";
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

  // Beach runs — explicit lookup table
  const beach = identifyBeach(d) ?? identifyBeach(p);
  if (beach !== null && !airportInvolved) {
    // 16+ pax on a north coast beach run → $100 per person (flat, no surcharge)
    if (pax >= 16 && NORTH_COAST_BEACHES.includes(beach)) {
      return pax * 100;
    }
    const origin = identifyBeach(d) !== null ? p : d;
    const region = identifyRegion(origin);
    const [oneWayRate, roundRate] = BEACH_RATES[beach][region];
    const base = tripType === "round" ? roundRate : oneWayRate;
    return base + paxSurcharge(pax);
  }

  const southInvolved = isSouth(d) || isSouth(p);

  // South non-beach: tiered by passenger count
  if (southInvolved && !airportInvolved) {
    if (pax > 18) return 1500;
    if (pax > 15) return 1200;
    if (pax >= 10) return 1000;
    return 800;
  }

  let base = 0;

  if (airportInvolved) {
    base = 400;
  } else if (d.includes("pos") || d.includes("diego") || d.includes("st james") || d.includes("port of spain")) {
    base = 300;
  } else if (isCentral(d) || d.includes("chaguanas") || d.includes("cunupia")) {
    base = 350;
  } else if (pickup && dropoff) {
    base = 400;
  }

  base += paxSurcharge(pax);

  if (base > 0 && base < 300) base = 300;

  return base;
}

function getMinDatetime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
}

const PAX_OPTIONS = [
  { value: 1,  label: "1–4 Passengers (Car / Small Group)" },
  { value: 5,  label: "5–8 Passengers (Mini Group)" },
  { value: 9,  label: "9–12 Passengers (12-Seater Maxi)" },
  { value: 13, label: "13–15 Passengers (14–15 Seater Maxi)" },
  { value: 16, label: "16–18 Passengers (18-Seater Maxi)" },
  { value: 19, label: "19–22 Passengers (22-Seater Maxi)" },
  { value: 23, label: "23–24 Passengers (24-Seater Maxi)" },
];

function BookingLookup() {
  const [refInput, setRefInput] = useState("");
  const [searchId, setSearchId] = useState("");

  const { data: job, isLoading, isError } = useGetJob(searchId, {
    query: { enabled: !!searchId },
  });

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending:   { label: "Awaiting Driver", color: "text-amber-700 bg-amber-50 border-amber-200" },
    claimed:   { label: "Driver Assigned", color: "text-teal-700 bg-teal-50 border-teal-200" },
    completed: { label: "Completed",        color: "text-gray-600 bg-gray-50 border-gray-200" },
  };

  return (
    <section className="py-16 px-6 md:px-12 bg-white/60">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
          <h2 className="text-3xl font-black text-teal-900 mb-2">Track Your Booking</h2>
          <p className="text-teal-700/70 text-sm">Enter the booking reference from your confirmation to check the status of your ride.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. M1234"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && setSearchId(refInput.trim())}
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
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusLabel[job.status]?.color ?? "text-gray-600 bg-gray-50 border-gray-200"}`}>
                  {statusLabel[job.status]?.label ?? job.status}
                </span>
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
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Driver Assigned</p>
                  </div>
                  {job.claimedBy && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-teal-400 uppercase tracking-wider mb-0.5">Driver</p>
                        <p className="font-bold text-teal-900">{job.claimedBy}</p>
                      </div>
                      {job.vehicleType && (
                        <div>
                          <p className="text-teal-400 uppercase tracking-wider mb-0.5">Vehicle</p>
                          <p className="font-bold text-teal-900">{job.vehicleType}</p>
                        </div>
                      )}
                      {job.numberPlate && (
                        <div className="col-span-2">
                          <p className="text-teal-400 uppercase tracking-wider mb-0.5">Plate Number</p>
                          <p className="font-bold text-teal-900 font-mono tracking-widest text-sm">{job.numberPlate}</p>
                        </div>
                      )}
                      {!job.vehicleType && !job.numberPlate && (
                        <div className="col-span-2">
                          <p className="text-teal-600/70">Vehicle details will be added shortly. You'll be contacted to confirm.</p>
                        </div>
                      )}
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

export default function Home() {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [tripType, setTripType] = useState<"one-way" | "round" | null>(null);
  const [pax, setPax] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupDatetime, setPickupDatetime] = useState("");
  const [datetimeError, setDatetimeError] = useState("");
  const [returnDatetime, setReturnDatetime] = useState("");
  const [returnDatetimeError, setReturnDatetimeError] = useState("");
  const [bookedJob, setBookedJob] = useState<{
    id: string; name: string; pickup: string; dropoff: string; deposit: number; fare: number; pickupDatetime: string; returnDatetime: string; tripType: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const createJob = useCreateJob();

  const fare = useMemo(() => tripType ? calculateFare(pickup, dropoff, tripType, pax) : 0, [pickup, dropoff, tripType, pax]);
  const deposit = fare > 0 ? Math.ceil(fare * 0.25) : 0;
  const fareCeiled = fare > 0 ? Math.ceil(fare) : 0;

  const validateDatetime = (value: string) => {
    if (!value) { setDatetimeError(""); return; }
    const selected = new Date(value);
    const minTime = new Date();
    minTime.setHours(minTime.getHours() + 1);
    if (selected < minTime) {
      setDatetimeError("Pickup time must be at least 1 hour from now so your driver can prepare.");
    } else {
      setDatetimeError("");
    }
  };

  const handleDatetimeChange = (value: string) => {
    setPickupDatetime(value);
    validateDatetime(value);
    // Re-validate return time if already set
    if (returnDatetime) validateReturnDatetime(value, returnDatetime);
  };

  const validateReturnDatetime = (pickup: string, ret: string) => {
    if (!ret) { setReturnDatetimeError(""); return; }
    if (!pickup) { setReturnDatetimeError("Please set a pickup time first."); return; }
    const pickupDate = new Date(pickup);
    const returnDate = new Date(ret);
    if (returnDate <= pickupDate) {
      setReturnDatetimeError("Return time must be after your pickup time.");
    } else {
      setReturnDatetimeError("");
    }
  };

  const handleReturnDatetimeChange = (value: string) => {
    setReturnDatetime(value);
    validateReturnDatetime(pickupDatetime, value);
    setShowErrors(false);
  };

  const [showErrors, setShowErrors] = useState(false);

  const isFormValid =
    !!tripType &&
    fare > 0 &&
    name.trim() !== "" &&
    phone.trim() !== "" &&
    pickupDatetime !== "" &&
    !datetimeError &&
    (tripType !== "round" || (returnDatetime !== "" && !returnDatetimeError));

  const fieldErrors = {
    pickup:         showErrors && !pickup.trim(),
    dropoff:        showErrors && !dropoff.trim(),
    tripType:       showErrors && !tripType,
    datetime:       showErrors && (!pickupDatetime || !!datetimeError),
    returnDatetime: showErrors && tripType === "round" && (!returnDatetime || !!returnDatetimeError),
    name:           showErrors && !name.trim(),
    phone:          showErrors && !phone.trim(),
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) { setShowErrors(true); return; }

    const tripLabel = tripType === "round" ? "Round Trip" : "One Way";
    const paxLabel = PAX_OPTIONS.find(o => o.value === pax)?.label ?? `${pax} passengers`;
    const returnNote = tripType === "round" && returnDatetime ? ` | Return: ${returnDatetime}` : "";
    const priceNote = `TTD ${fareCeiled} (${tripLabel}, ${paxLabel}) — Pickup: ${pickupDatetime}${returnNote}`;

    createJob.mutate(
      { data: { pickup, dropoff, name, phone, price: priceNote, passengers: paxLabel } },
      {
        onSuccess: (job) => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
          setBookedJob({ id: job.id, name, pickup, dropoff, deposit, fare: fareCeiled, pickupDatetime, returnDatetime, tripType: tripType ?? "one-way" });
        },
      }
    );
  };

  if (bookedJob) {
    const formattedDate = new Date(bookedJob.pickupDatetime).toLocaleString("en-TT", {
      weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{ fontFamily: "'Outfit', sans-serif", background: "linear-gradient(135deg, #0f3d2e 0%, #1a5c42 50%, #c8861a 100%)" }}>
        <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #ce1126, #000000, #ce1126)" }} />
          <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-700" />
            </div>
            <h2 className="text-2xl font-bold text-teal-950 mb-1">Booking Confirmed!</h2>
            <p className="text-sm text-teal-700 mb-4">
              Thank you, <strong>{bookedJob.name}</strong>! Your ride from <strong>{bookedJob.pickup}</strong> to <strong>{bookedJob.dropoff}</strong> is confirmed.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full mb-3 text-left">
              <p className="text-xs text-teal-600 font-mono uppercase tracking-wider mb-1">
                {bookedJob.tripType === "round" ? "Outbound Pickup" : "Pickup Time"}
              </p>
              <p className="text-sm font-semibold text-teal-900">{formattedDate}</p>
            </div>
            {bookedJob.tripType === "round" && bookedJob.returnDatetime && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full mb-3 text-left">
                <p className="text-xs text-teal-600 font-mono uppercase tracking-wider mb-1">Return Pickup</p>
                <p className="text-sm font-semibold text-teal-900">
                  {new Date(bookedJob.returnDatetime).toLocaleString("en-TT", {
                    weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full mb-3 text-left">
              <p className="text-xs text-teal-600 font-mono uppercase tracking-wider mb-1">Deposit Due</p>
              <p className="text-2xl font-bold text-teal-900">TTD {bookedJob.deposit}</p>
              <p className="text-xs text-teal-600 mt-1">Total fare: TTD {bookedJob.fare} · Balance of TTD {bookedJob.fare - bookedJob.deposit} payable to your driver on the day</p>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 w-full mb-6 text-left flex items-start gap-3">
              <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <p className="text-xs text-teal-700 leading-relaxed">
                Our team will contact you on <strong>{bookedJob.name.split(" ")[0]}'s</strong> number via WhatsApp to collect the deposit and confirm your driver. Please keep your phone nearby.
              </p>
            </div>
            <p className="text-xs text-teal-500 font-mono mb-6">Booking Ref: <strong>{bookedJob.id}</strong> — save this to track your ride</p>
            <Button
              className="w-full text-white font-bold"
              style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}
              onClick={() => {
                setBookedJob(null);
                setPickup(""); setDropoff(""); setName(""); setPhone("");
                setPickupDatetime(""); setReturnDatetime(""); setReturnDatetimeError(""); setTripType(null); setPax(1);
              }}
            >
              Book Another Ride
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF4] text-teal-950" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ── HEADER with T&T Trini flavour ── */}
      <header style={{ background: "linear-gradient(90deg, #0f3d2e 0%, #1a5c42 60%, #0f3d2e 100%)" }}
              className="text-amber-50 shadow-lg">
        {/* T&T flag stripe */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ce1126 0%, #000 40%, #ce1126 100%)" }} />
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-md"
                   style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                <span className="text-teal-900">M</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Maxi Hub TT</h1>
              <p className="text-xs text-amber-300 font-medium tracking-widest uppercase">Premium Shuttle Service</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-teal-100">
              <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">Trinidad & Tobago</span>
              <span className="mx-2 text-amber-400">✦</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">Private Hire</span>
              <span className="mx-2 text-amber-400">✦</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">Airport Runs</span>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-whatsapp-header"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95"
              style={{ background: "#25D366" }}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp Us</span>
            </a>
          </div>
        </div>

        {/* Tagline banner */}
        <div className="border-t border-white/10 py-2 text-center"
             style={{ background: "rgba(0,0,0,0.15)" }}>
          <p className="text-xs text-amber-200 font-medium tracking-widest uppercase">
            🌴 &nbsp; Safe. Smooth. On Time. That's How We Roll. &nbsp; 🌴
          </p>
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
                Premium private hire shuttle for individuals, groups, airport runs, beach trips & events. No haggling — transparent rates, real reliability.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Airport Runs", "Beach Limes", "Group Events", "Corporate"].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-900/10 text-teal-800 border border-teal-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Booking Form */}
        <div className="p-6 md:p-12 lg:py-10 flex items-start justify-center z-10 relative">
          <Card className="w-full max-w-lg shadow-xl shadow-amber-900/5 border-amber-100 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
            <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126, #f59e0b, #0f3d2e)" }} />
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-2xl text-teal-900 font-black">Book Your Maxi</CardTitle>
              <CardDescription className="text-teal-700/70">
                Private hire rates. Transparent pricing. No surprise quotes.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Route inputs */}
                <div className="space-y-3 relative">
                  <div className="absolute left-[15px] top-[36px] bottom-[36px] w-[2px] bg-amber-200 z-0 hidden md:block" />

                  <div className="space-y-1.5 relative z-10">
                    <Label htmlFor="pickup" className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                      <div className="bg-amber-100 p-1 rounded-full">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      Pickup Location
                    </Label>
                    <Input
                      id="pickup"
                      data-testid="input-pickup"
                      placeholder="e.g. Maracas Bay, POS, Piarco Airport..."
                      className={`h-11 rounded-xl focus-visible:ring-teal-500 bg-white text-teal-900 placeholder:text-teal-400 ${fieldErrors.pickup ? "border-red-400 border-2" : "border-teal-100"}`}
                      value={pickup}
                      onChange={(e) => { setPickup(e.target.value); setShowErrors(false); }}
                      required
                    />
                    {fieldErrors.pickup && <p className="text-xs text-red-600 font-medium mt-1">Please enter a pickup location.</p>}
                  </div>

                  <div className="space-y-1.5 relative z-10">
                    <Label htmlFor="dropoff" className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                      <div className="bg-teal-100 p-1 rounded-full">
                        <Navigation className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      Dropoff Location
                    </Label>
                    <Input
                      id="dropoff"
                      data-testid="input-dropoff"
                      placeholder="e.g. San Fernando, Chaguanas, Las Cuevas..."
                      className={`h-11 rounded-xl focus-visible:ring-teal-500 bg-white text-teal-900 placeholder:text-teal-400 ${fieldErrors.dropoff ? "border-red-400 border-2" : "border-teal-100"}`}
                      value={dropoff}
                      onChange={(e) => { setDropoff(e.target.value); setShowErrors(false); }}
                      required
                    />
                    {fieldErrors.dropoff && <p className="text-xs text-red-600 font-medium mt-1">Please enter a dropoff location.</p>}
                  </div>
                </div>

                {/* Trip type */}
                <div className="space-y-1.5">
                  <Label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600" />
                    Trip Type
                  </Label>
                  <div className={`grid grid-cols-2 gap-2 rounded-xl p-0.5 ${fieldErrors.tripType ? "ring-2 ring-red-400" : ""}`}>
                    {(["one-way", "round"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { setTripType(type); if (type === "one-way") { setReturnDatetime(""); setReturnDatetimeError(""); } setShowErrors(false); }}
                        className={`h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
                          tripType === type
                            ? "border-teal-600 bg-teal-600 text-white"
                            : tripType === null
                            ? "border-dashed border-teal-200 bg-white text-teal-600 hover:border-teal-400"
                            : "border-teal-100 bg-white text-teal-800 hover:border-teal-300"
                        }`}
                      >
                        {type === "one-way" ? "One Way" : "Round Trip"}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.tripType && <p className="text-xs text-red-600 font-medium mt-1">Please select a trip type.</p>}
                </div>

                {/* Passengers */}
                <div className="space-y-1.5">
                  <Label htmlFor="paxSelect" className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    Passengers
                  </Label>
                  <select
                    id="paxSelect"
                    data-testid="select-pax"
                    className="w-full h-11 px-4 rounded-xl border-2 border-teal-100 bg-white focus:border-teal-500 focus:outline-none text-teal-900 text-sm transition-colors"
                    value={pax}
                    onChange={(e) => setPax(parseInt(e.target.value))}
                  >
                    {PAX_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Pickup date & time */}
                <div className="space-y-1.5">
                  <Label htmlFor="pickupDatetime" className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    Pickup Date & Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600/40 pointer-events-none" />
                    <input
                      id="pickupDatetime"
                      data-testid="input-datetime"
                      type="datetime-local"
                      min={getMinDatetime()}
                      className={`w-full h-11 pl-9 pr-4 rounded-xl border-2 bg-white focus:outline-none text-teal-900 text-sm transition-colors ${fieldErrors.datetime ? "border-red-400 focus:border-red-400" : "border-teal-100 focus:border-teal-500"}`}
                      value={pickupDatetime}
                      onChange={(e) => { handleDatetimeChange(e.target.value); setShowErrors(false); }}
                      required
                    />
                  </div>
                  {datetimeError ? (
                    <p className="text-xs text-red-600 font-medium">{datetimeError}</p>
                  ) : pickupDatetime ? (
                    <p className="text-xs text-teal-600">Driver gets at least 1 hour to prepare — guaranteed.</p>
                  ) : (
                    <p className="text-xs text-teal-600/60">Minimum 1 hour notice required for all bookings.</p>
                  )}
                </div>

                {/* Return Date & Time — only for round trips */}
                {tripType === "round" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="returnDatetime" className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      Return Date & Time
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50 pointer-events-none" />
                      <input
                        id="returnDatetime"
                        data-testid="input-return-datetime"
                        type="datetime-local"
                        min={pickupDatetime || getMinDatetime()}
                        className={`w-full h-11 pl-9 pr-4 rounded-xl border-2 bg-white focus:outline-none text-teal-900 text-sm transition-colors ${fieldErrors.returnDatetime ? "border-red-400 focus:border-red-400" : "border-amber-200 focus:border-amber-400"}`}
                        value={returnDatetime}
                        onChange={(e) => handleReturnDatetimeChange(e.target.value)}
                        required
                      />
                    </div>
                    {returnDatetimeError ? (
                      <p className="text-xs text-red-600 font-medium">{returnDatetimeError}</p>
                    ) : fieldErrors.returnDatetime ? (
                      <p className="text-xs text-red-600 font-medium">Please select a return date and time.</p>
                    ) : returnDatetime ? (
                      <p className="text-xs text-teal-600">Return pickup confirmed.</p>
                    ) : (
                      <p className="text-xs text-amber-600/80">When should your driver pick you up on the way back?</p>
                    )}
                  </div>
                )}

                {/* Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-teal-900 font-medium text-sm">Your Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600/40" />
                      <Input
                        id="name"
                        data-testid="input-name"
                        placeholder="e.g. Kezia"
                        className={`pl-9 h-11 rounded-xl focus-visible:ring-teal-500 bg-white text-teal-900 placeholder:text-teal-400 ${fieldErrors.name ? "border-red-400 border-2" : "border-teal-100"}`}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setShowErrors(false); }}
                        required
                      />
                      {fieldErrors.name && <p className="text-xs text-red-600 font-medium mt-1">Required.</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-teal-900 font-medium text-sm">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600/40" />
                      <Input
                        id="phone"
                        data-testid="input-phone"
                        type="tel"
                        placeholder="868-XXX-XXXX"
                        className={`pl-9 h-11 rounded-xl focus-visible:ring-teal-500 bg-white text-teal-900 placeholder:text-teal-400 ${fieldErrors.phone ? "border-red-400 border-2" : "border-teal-100"}`}
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setShowErrors(false); }}
                        required
                      />
                      {fieldErrors.phone && <p className="text-xs text-red-600 font-medium mt-1">Required.</p>}
                    </div>
                  </div>
                </div>

                {/* Fare & Deposit summary */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden rounded-2xl border ${
                  fare > 0
                    ? "bg-amber-50/80 border-amber-200 p-4 opacity-100 max-h-96"
                    : "bg-transparent border-transparent p-0 max-h-0 opacity-0"
                }`}>
                  {fare > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-amber-200/60">
                        <div>
                          <span className="text-teal-800 font-medium text-sm">Estimated Fare</span>
                          <p className="text-xs text-teal-600/70">
                            {tripType === "round" ? "Round trip" : "One way"} · {PAX_OPTIONS.find(o => o.value === pax)?.label}
                          </p>
                        </div>
                        <span className="text-2xl font-black text-teal-900">TTD {fareCeiled}</span>
                      </div>
                      <div className="flex gap-3 items-start bg-white/70 p-3 rounded-xl border border-amber-100">
                        <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-teal-900">
                            25% Deposit to Confirm: TTD {deposit}
                          </p>
                          <p className="text-xs text-teal-700/80 mt-1 leading-relaxed">
                            Balance of TTD {fareCeiled - deposit} paid directly to your driver. Deposit holds your booking and covers driver preparation time.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error state */}
                {createJob.isError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                    Something went wrong. Try again or call us directly.
                  </p>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  data-testid="button-book"
                  disabled={createJob.isPending}
                  onClick={() => { if (!isFormValid) setShowErrors(true); }}
                  className="w-full h-auto py-3 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-white border-0 flex flex-col items-center gap-0.5"
                  style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}
                >
                  {createJob.isPending ? (
                    <span className="flex items-center gap-2 text-base font-black">
                      <Loader2 className="w-5 h-5 animate-spin" /> Confirming your booking...
                    </span>
                  ) : fare > 0 ? (
                    <>
                      <span className="text-base font-black leading-tight">Confirm Booking</span>
                      <span className="text-xs font-semibold opacity-90">TTD {deposit} deposit due on confirmation</span>
                    </>
                  ) : (
                    <span className="text-base font-black">Enter Route to See Your Fare</span>
                  )}
                </Button>

                {/* Validation summary */}
                {showErrors && !isFormValid && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <Info className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 font-medium">Please fill in all highlighted fields before confirming your booking.</p>
                  </div>
                )}

                {/* Deposit note */}
                <div className="text-center">
                  <p className="text-xs text-zinc-400">25% deposit required to confirm booking</p>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* How It Works */}
      <section className="py-16 px-6 md:px-12" style={{ background: "linear-gradient(180deg, #FFFBF4 0%, #f0fdf8 100%)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
            <h2 className="text-3xl font-black text-teal-900 mb-2">How It Works</h2>
            <p className="text-teal-700/70 text-sm">Booking your ride takes less than 2 minutes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-amber-200" />
            {[
              {
                step: "1",
                icon: "📍",
                title: "Enter Your Route",
                desc: "Fill in your pickup location, dropoff, trip type, passengers, and preferred date and time.",
              },
              {
                step: "2",
                icon: "💳",
                title: "Pay 25% Deposit",
                desc: "See your instant fare estimate and secure your booking with a small deposit. The balance is paid to your driver.",
              },
              {
                step: "3",
                icon: "🚐",
                title: "Your Driver Arrives",
                desc: "A verified driver claims your job and contacts you directly. Sit back and enjoy the ride.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center relative z-10">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 shadow-md border-4 border-white"
                     style={{ background: "linear-gradient(135deg, #f0fdf4, #d1fae5)" }}>
                  {icon}
                </div>
                <div className="w-7 h-7 rounded-full text-xs font-black text-white flex items-center justify-center -mt-3 mb-4 shadow"
                     style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}>
                  {step}
                </div>
                <h3 className="text-teal-900 font-bold text-lg mb-2">{title}</h3>
                <p className="text-teal-700/70 text-sm leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BookingLookup />

      {/* Footer */}
      <footer className="text-amber-50 text-sm py-8 px-6 md:px-12 text-center"
              style={{ background: "linear-gradient(90deg, #0f3d2e 0%, #1a5c42 60%, #0f3d2e 100%)" }}>
        <div className="h-0.5 w-24 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
        <p className="font-black text-base mb-1">Maxi Hub TT</p>
        <p className="text-teal-300 text-xs">Premium Private Hire · Trinidad &amp; Tobago</p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-whatsapp-footer"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: "#25D366" }}
        >
          <MessageCircle className="w-4 h-4" />
          Chat with us on WhatsApp
        </a>
        <p className="text-teal-400/60 text-xs mt-4">Safe. Smooth. On Time. That's How We Roll.</p>
      </footer>

      {/* Floating WhatsApp button */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="link-whatsapp-float"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{ background: "#25D366" }}
      >
        <MessageCircle className="w-7 h-7 text-white fill-white" />
      </a>
    </div>
  );
}
