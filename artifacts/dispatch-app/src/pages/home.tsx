import { useState, useMemo } from "react";
import { useCreateJob, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
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

function isSouth(loc: string): boolean {
  return ["san fernando", "penal", "siparia", "point fortin", "fyzabad", "cedros", "moruga", "princes town", "gasparillo", "marabella", "south"].some(k => loc.includes(k));
}

function southDepth(loc: string): number {
  if (["point fortin", "cedros", "fyzabad", "moruga", "siparia"].some(k => loc.includes(k))) return 3;
  if (["penal", "princes town", "gasparillo"].some(k => loc.includes(k))) return 2;
  if (["san fernando", "marabella"].some(k => loc.includes(k))) return 1;
  return 1;
}

function calculateFare(pickup: string, dropoff: string, tripType: string, pax: number): number {
  const p = pickup.toLowerCase();
  const d = dropoff.toLowerCase();

  // South round trip: TTD 100 per person, minimum TTD 1,000 if under 10 people
  // This takes priority over all other south pricing when trip is round
  const southInvolved = isSouth(d) || isSouth(p);
  if (tripType === "round" && southInvolved && !d.includes("airport") && !p.includes("airport")) {
    const perPerson = pax * 100;
    return pax < 10 ? Math.max(perPerson, 1000) : perPerson;
  }

  let base = 0;

  const crossWestSouth = (isWest(p) && isSouth(d)) || (isSouth(p) && isWest(d));

  if (d.includes("airport") || p.includes("airport")) {
    base = 400;
  } else if (d.includes("maracas") || d.includes("las cuevas")) {
    base = 800;
  } else if (crossWestSouth) {
    const depth = isSouth(d) ? southDepth(d) : southDepth(p);
    if (depth === 1) base = 1000;
    else if (depth === 2) base = 1200;
    else base = 1400;
  } else if (d.includes("pos") || d.includes("diego") || d.includes("st james") || d.includes("port of spain")) {
    base = 300;
  } else if (d.includes("chaguanas") || d.includes("cunupia")) {
    base = 350;
  } else if (d.includes("san fernando") || d.includes("penal")) {
    base = 550;
  } else if (pickup && dropoff) {
    base = 400;
  }

  if (tripType === "round") {
    base = base * 1.7;
  }

  if (pax > 12 && pax <= 15) base += 100;
  if (pax > 15 && pax <= 18) base += 150;
  if (pax > 18 && pax <= 22) base += 250;
  if (pax > 22) base += 350;

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

export default function Home() {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [tripType, setTripType] = useState<"one-way" | "round">("one-way");
  const [pax, setPax] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupDatetime, setPickupDatetime] = useState("");
  const [datetimeError, setDatetimeError] = useState("");
  const [bookedJob, setBookedJob] = useState<{
    id: string; name: string; pickup: string; dropoff: string; deposit: number; fare: number; pickupDatetime: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const createJob = useCreateJob();

  const fare = useMemo(() => calculateFare(pickup, dropoff, tripType, pax), [pickup, dropoff, tripType, pax]);
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
  };

  const isFormValid = fare > 0 && name.trim() && phone.trim() && pickupDatetime && !datetimeError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const priceNote = `TTD ${fareCeiled} (${tripType === "round" ? "Round Trip" : "One Way"}, ${PAX_OPTIONS.find(o => o.value === pax)?.label ?? pax + " pax"}) — Pickup: ${pickupDatetime}`;

    createJob.mutate(
      { data: { pickup, dropoff, name, phone, price: priceNote } },
      {
        onSuccess: (job) => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
          setBookedJob({ id: job.id, name, pickup, dropoff, deposit, fare: fareCeiled, pickupDatetime });
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
              <p className="text-xs text-teal-600 font-mono uppercase tracking-wider mb-1">Pickup Time</p>
              <p className="text-sm font-semibold text-teal-900">{formattedDate}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full mb-6 text-left">
              <p className="text-xs text-teal-600 font-mono uppercase tracking-wider mb-1">Deposit Paid</p>
              <p className="text-2xl font-bold text-teal-900">TTD {bookedJob.deposit}</p>
              <p className="text-xs text-teal-600 mt-1">Remaining TTD {bookedJob.fare - bookedJob.deposit} due to driver</p>
            </div>
            <p className="text-xs text-teal-500 font-mono mb-6">Ref: {bookedJob.id}</p>
            <p className="text-sm text-teal-700 mb-6">Your driver will be in touch. Please keep your phone nearby.</p>
            <Button
              className="w-full text-white font-bold"
              style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}
              onClick={() => {
                setBookedJob(null);
                setPickup(""); setDropoff(""); setName(""); setPhone("");
                setPickupDatetime(""); setTripType("one-way"); setPax(1);
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
                      className="h-11 border-teal-100 rounded-xl focus-visible:ring-teal-500 bg-white text-teal-900 placeholder:text-teal-400"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      required
                    />
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
                      className="h-11 border-teal-100 rounded-xl focus-visible:ring-teal-500 bg-white text-teal-900 placeholder:text-teal-400"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Trip type */}
                <div className="space-y-1.5">
                  <Label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600" />
                    Trip Type
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["one-way", "round"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTripType(type)}
                        className={`h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
                          tripType === type
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-teal-100 bg-white text-teal-800 hover:border-teal-300"
                        }`}
                      >
                        {type === "one-way" ? "One Way" : "Round Trip"}
                      </button>
                    ))}
                  </div>
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
                      className="w-full h-11 pl-9 pr-4 rounded-xl border-2 border-teal-100 bg-white focus:border-teal-500 focus:outline-none text-teal-900 text-sm transition-colors"
                      value={pickupDatetime}
                      onChange={(e) => handleDatetimeChange(e.target.value)}
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
                        className="pl-9 h-11 border-teal-100 rounded-xl focus-visible:ring-teal-500 bg-white text-teal-900 placeholder:text-teal-400"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
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
                        className="pl-9 h-11 border-teal-100 rounded-xl focus-visible:ring-teal-500 bg-white text-teal-900 placeholder:text-teal-400"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
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
                  disabled={!isFormValid || createJob.isPending}
                  className="w-full h-14 text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-white border-0"
                  style={{ background: isFormValid ? "linear-gradient(135deg, #0f3d2e, #1a5c42)" : undefined }}
                >
                  {createJob.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Confirming your booking...
                    </span>
                  ) : fare > 0 ? (
                    `Pay TTD ${deposit} Deposit — Book Now`
                  ) : (
                    "Enter Route to See Your Fare"
                  )}
                </Button>

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
