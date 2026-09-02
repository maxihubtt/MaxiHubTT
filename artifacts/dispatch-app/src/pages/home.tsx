import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateJob, useGetJob, getGetJobQueryKey, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Navigation, User, Phone, CheckCircle2, Info, Loader2, Clock, Calendar, Users, ArrowLeftRight, Plane, Waves, Briefcase, Copy, Check, ChevronRight, ChevronLeft, MessageCircle, AlertTriangle, Star, Car, MessageSquare, Mail } from "lucide-react";
import { BUS_OPTIONS, LOCATION_SUGGESTIONS, busCapacity, calculateFare, formatMoney, hasSufficientBusCapacity, minimumBuses, resolveLocation } from "@workspace/fare-engine";

interface BookingConfig {
  deposit_pct: number;
  rush_fee: number;
  min_booking_hours: number;
  same_day_min_hours: number;
  urgent_enabled: boolean;
}

const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  deposit_pct: 25,
  rush_fee: 150,
  min_booking_hours: 6,
  same_day_min_hours: 2,
  urgent_enabled: true,
};

async function fetchBookingConfig(): Promise<BookingConfig> {
  try {
    const res = await fetch("/api/config/booking");
    if (!res.ok) return DEFAULT_BOOKING_CONFIG;
    return res.json() as Promise<BookingConfig>;
  } catch {
    return DEFAULT_BOOKING_CONFIG;
  }
}

const WA_BASE = "https://wa.me/18684818039?text=";
const waLink = (msg: string) => WA_BASE + encodeURIComponent(msg);

function isWest(loc: string): boolean {
  return [
    "port of spain", "pos", "diego martin", "saint james", "st james",
    "westmoorings", "west moorings", "chaguaramas", "maraval", "saint clair", "st clair",
    "woodbrook", "petit valley", "carenage", "laventille", "morvant", "cocorite",
    "cascade", "mucurapo", "newtown", "beetham", "barataria", "aranguez",
    "el socorro", "mount hope", "mount lambert west", "upper laventille",
    "success village", "d martin", "santa cruz", "signal hill", "the saddle",
    "federation park", "belmont", "gonzales", "east dry river", "west dry river",
    "richplain", "four roads", "long circular", "glencoe", "morne coco",
    "boissiere", "ellerslie park", "andalusia", "starlite", "carapo",
    "blue range", "warren", "patna", "sea lots", "gulf city mall",
    "trou macaque", "patna village", "fairways", "long circular mall",
    // additional west areas
    "st francois valley", "saint francois valley", "paramin", "bayshore",
    "goodwood park", "haleland park", "glenroyal", "covigne", "bel air",
    "ben lomond", "reform", "nook avenue", "upper maraval", "lower maraval",
    "marli street", "duke street", "park street", "charlotte street",
    "henry street", "independence square", "queens park savannah",
    "queen park savannah", "the savannah", "botanic gardens", "the oval",
    "movie towne", "invaders bay", "the falls at west mall", "west mall",
    "c3 centre", "gulf city las alturas", "el dorado west", "bournes road",
    "observatory street", "tranquillity", "st vincent street", "brian lara promenade",
    "victoria square", "chacon street", "abercromby street", "frederick street",
    "sackville street", "nelson street", "george street", "broadway",
    "wrightson road", "audrey jeffers highway", "lady young road",
    "fort george", "morne coco road", "river estate", "macqueripe",
    "chaguaramas bay", "teteron", "carenage bay", "gasparee",
    "champs fleurs", "calvary hill", "lower barataria", "upper barataria",
    "croisee de barataria", "mt hope", "noel street", "tarouba",
    "cocorite village", "western main road", "mucurapo road",
    // more west / pOS areas
    "tucker valley", "la seiva", "la joya", "chagville", "river road west",
    "caroni swamp", "caroni bird sanctuary", "caroni arena",
    "saint anns", "st anns", "upper cascade", "maracas valley", "barataria east",
    "starlite park", "les efforts", "marianne", "dundonald hill",
    "nook", "fondes amandes", "lady young", "upper laventille south",
    "calvary hill extension", "beetham land", "beetham estate",
    "belmont valley road", "observatory", "long circular road",
    "lady young road extension", "penco road", "morne diablo west",
    // extra west areas
    "petit bourg west", "down the islands", "monos island", "gaspar grande",
    "huevos", "chacachacare", "coral cove", "maqueripe", "williams bay",
    "stollmeyer", "long circular mall", "west mall west",
    "la seiva road", "chagville village", "des vignes", "dundonald street",
    "keate street", "henry street west", "nelson street west",
    "pemberton street", "cipriani boulevard", "wrightson road west",
    "port of spain", "pos", "newcastle street", "albany street",
    "st ann's road", "cascade road", "upper cascade road",
    "morne coco rd", "petit valley road", "la resource west",
    // hotels & hospitality
    "hyatt regency", "hyatt trinidad", "trinidad hilton", "hilton trinidad",
    "courtyard marriott", "marriott trinidad", "cascadia hotel", "cascadia trinidad",
    "hotel normandie", "normandie hotel", "kapok hotel", "radisson hotel",
    "holiday inn pos", "asa wright lodge", "chaguaramas hotel",
    // stadiums & sports
    "hasely crawford stadium", "hasely crawford", "national stadium",
    "jean pierre complex", "jean pierre stadium",
    "queens park oval", "queen's park oval",
    // healthcare
    "port of spain general hospital", "pos general hospital",
    "st clair medical centre", "medical associates", "westshore medical",
    // cultural / entertainment
    "emperor valley zoo", "emperor zoo", "national zoo",
    "queen's hall", "queens hall",
    "national library", "nalis trinidad", "national museum trinidad",
    "red house trinidad", "hall of justice pos",
    "movietowne", "imax", "carib cinemas",
    // shopping
    "8 grand bazaar", "falls at west mall",
  ].some(k => loc.includes(k));
}
function isCentral(loc: string): boolean {
  return [
    "chaguanas", "cunupia", "couva", "freeport", "brechin castle", "felicity",
    "longdenville", "charlieville", "carlsen field", "montserrat", "endeavour",
    "springvale", "chase village", "edinburgh", "kelly village", "caroni",
    "warrenville", "claxton bay", "gasparillo central", "pointe a pierre",
    "pointe-a-pierre", "preysal", "mon repos", "mc bean", "mcbean", "skinner park",
    "naparima bowl", "todd street", "centre pointe mall", "highway plaza",
    "ramsaran street", "cross crossing", "endeavour road", "interchange",
    "montrose", "munroe road", "southern main road central", "st mary",
    "ste madeleine", "brechin", "buen intento", "hermitage", "palmiste",
    "california", "waterloo", "chandernagore", "carapichaima",
    // additional central areas
    "orange field", "st helena", "saint helena", "brickfield",
    "pierre road", "orange valley", "caparo valley", "brasso",
    "brasso caparo", "la paille", "bon aventure", "d'abadie south",
    "felicite", "enterprise central", "todds road", "southern main road",
    "mill street", "race course", "central market", "chaguanas main road",
    "high street chaguanas", "writers avenue", "endeavour road",
    "mc bean village", "forest reserve", "perot", "st madeline",
    "la romaine", "navet road", "plum mitan", "buen intento road",
    "caparo", "coolie trace", "hindustan", "cedros junction",
    "san isidore", "el carmen", "palmyra", "retrench", "gran couva",
    "hindustan road", "carli bay", "chaguanas bypass", "uriah butler highway",
    "sir solomon hochoy highway", "ssolomon hochoy", "midcenter mall",
    "price plaza", "excellent city centre", "trincity central",
    // more central areas
    "point lisas", "point lisas industrial", "samaroo village", "tabaquite",
    "jerningham junction", "golconda", "craignish", "mt pleasant central",
    "southern main road west", "navet reservoir", "mt pleasant village",
    "brechin castle estate", "felicity junction", "charlieville extension",
    "couva junction", "railway road central", "claxton bay extension",
    "gasparillo junction", "pointe a pierre south", "st mary junction",
    "chase village junction", "mc bean road", "warrenville junction",
    // extra central areas
    "talparo", "madras road", "enterprise central", "el carmen central",
    "hindustan trace", "dow village central", "reform central",
    "st helena village", "buen intento village", "hermitage central",
    "plum mitan road", "navet road central", "marathon road",
    "caroni arena road", "felicite road", "freeport main road",
    "longdenville main road", "chaguanas market", "high street",
    "chaguanas bypass", "southern main rd central", "chaguanas east",
    "enterprise road", "todd street south", "writer's avenue",
    "esperanza", "brasso caparo road", "caparo junction",
    "orange field road", "waterloo road", "chandernagore road",
    // popular leisure / tourist destinations (central)
    "harrys fun park", "harry's fun park", "harrys water park", "harry's water park",
    "harrys park", "harry park", "harry fun", "harry water",
    "waterloo temple", "temple in the sea", "temple at sea",
    "must marine waterloo", "waterloo waterfront",
    "carapichaima recreation", "felicity park",
    "arena recreation centre", "arena sports",
    // shopping / commercial
    "centre pointe", "center pointe", "chaguanas mall",
    "trincity central mall", "excellent stores", "kirpalanis",
    // healthcare (central)
    "couva medical", "couva hospital", "couva health",
    "point lisas hospital", "penal hospital",
  ].some(k => loc.includes(k));
}
function isEast(loc: string): boolean {
  return [
    "san juan", "saint joseph", "st joseph", "curepe", "valsayn", "mount lambert",
    "tunapuna", "arima", "arouca", "tacarigua", "sangre grande", "valencia",
    "grand bazaar", "trincity", "dabadie", "d'abadie", "malabar", "maloney",
    "toco", "matelot", "balandra", "saline", "demerara", "piarco", "lopinot",
    "santa rosa", "cumana", "guaico", "tumpuna", "saint augustine", "st augustine",
    "five rivers", "el dorado", "golden grove", "bejucal", "heights of guanapo",
    "airport", "piarco airport", "international airport",
    "east west corridor", "ewc", "d abadie", "bon air", "eden gardens",
    "gordon street", "o'meara", "omeara", "hollis avenue", "eastern main road",
    "university of the west indies", "uwi", "st augustine campus",
    "zero", "zero street", "clocktower", "beetham highway east",
    "mount d or", "mount dor", "the arena", "cleaver road", "waller field",
    "blanchette", "peter hill", "santa flora east", "new grant",
    // additional east areas
    "macoya", "pasea estate", "matura", "fishing pond", "tamana",
    "coalmine", "galera", "salybia", "rampanalgas", "toco main road",
    "heights of aripo", "aripo", "el socorro east", "south quay east",
    "beetham gardens", "morvant extension", "la horquetta", "lahorquetta",
    "o meara road", "trincity mall", "d abadie village",
    "guaico tamana", "biche", "biche road", "platanal", "sangre chiquito",
    "turure", "poole", "vega de oropouche", "wallerfield",
    "cumuto", "mount aripo", "brasso seco", "paria main road",
    "toco bay", "grandes riviere", "matelot village",
    "san rafael", "la fillette", "petit valley east",
    "hillsborough dam", "verdant vale", "mt pleasant east",
    // more east areas
    "maloney gardens", "o meara industrial", "trincity estate",
    "tamana industrial", "imperial road", "biche village", "carapo east",
    "sangre chiquito junction", "heights of el socorro", "mar road",
    "five rivers extension", "mount aripo trail", "paria springs",
    "blanchette road", "arena junction", "santa rosa extension",
    "golden grove estate", "south oropouche", "spring bridge",
    "demerara road", "cunapo southern", "cunapo northern",
    "matura junction", "galera point", "saline bay east",
    "toco beach", "grande riviere", "matelot junction",
    // extra east areas
    "orange grove", "caura", "two mile", "malick", "upper malick",
    "lower malick", "upper barataria east", "junior sammy road",
    "laventille east", "beetham highway", "simbhoonath road",
    "pasea main road", "tunapuna road", "eastern main rd",
    "el dorado road", "la horquetta road", "cumuto main road",
    "verdant vale road", "heights of guanapo road", "arima bypass",
    "piarco main road", "airport road", "trincity road",
    "nariva swamp", "cocos bay road", "platanal road",
    "mount lambert east", "san juan extension", "don miguel road",
    "el socorro road", "priority bus route", "pbr",
    "beetham expressway", "tumpuna road", "lopinot road",
    "la horquetta bypass", "arima old road",
    // popular leisure / tourist (east)
    "asa wright nature centre", "asa wright", "asa wright lodge",
    "springhill estate arima", "caura valley", "caura recreational park",
    "caura park", "arima velodrome", "velodrome arima",
    "heights of guanapo recreational", "lopinot complex", "lopinot heritage",
    "hollis reservoir", "navet dam east",
    // shopping / commercial (east)
    "trincity mall", "trincity central", "grand bazaar centre",
    "arima market", "arima town centre",
    // healthcare (east)
    "ewmsc", "eric williams medical sciences", "mount hope hospital",
    "arima general hospital", "arima hospital",
    "sangre grande hospital", "sangre grande medical",
    "eastern regional health", "north east regional",
  ].some(k => loc.includes(k));
}
function isSouth(loc: string): boolean {
  return [
    "san fernando", "penal", "siparia", "point fortin", "fyzabad", "cedros",
    "moruga", "princes town", "prince town", "gasparillo", "marabella",
    "barrackpore", "rio claro", "la brea", "debe", "naparima", "williamsville",
    "tableland", "pointe-a-pierre", "preysal", "mon repos", "paradise pasture",
    "gulf view", "south park", "pleasantville", "fernando",
    "harris promenade", "coffee street", "high street sf", "gulf city",
    "mon chagrin", "la resource", "sobo", "southern main road south",
    "cross crossing south", "st julien", "les efforts", "rushworth street",
    "paradise hill", "vistabella", "upper coora", "lower coora",
    "princess town", "st mary village", "harmony hall", "lengua",
    "la fortune", "bamboo", "ste madeleine south", "enterprise",
    "corinth", "navet", "corosal", "morne diablo", "rancho quemado",
    "vessigny village", "cap de ville", "bonasse", "irois bay",
    // additional south areas
    "santa flora", "oropouche", "penal rock road", "monkey town",
    "convert", "california south", "st mary", "la lune",
    "icacos village", "granville", "guayaguayare", "radix",
    "basse terre", "st george", "parrylands", "paradise village",
    "siparia main road", "penal main road", "barrackpore main road",
    "navet dam", "world's end", "worlds end", "spring trace",
    "corosal village", "rancho quemado road", "bronte", "rambert",
    "palo seco", "inniss", "junction", "thick village",
    "la lune road", "laborie", "rochard road", "les efforts east",
    "les efforts west", "cunjal", "gasparillo south", "ste madeleine village",
    "pond road", "princess town main road", "naparima mayaro road",
    "naparima prionces road", "high street princes town",
    "rushworth street sf", "cipero street", "st james street sf",
    "st paul's road", "lady hailes avenue", "coffee street sf",
    "penitence hill", "oropouche road", "south trunk road",
    "cocoyea village", "rousillac", "cap de ville road",
    "pitch lake", "brighton", "california village",
    // more south areas
    "guapo", "guapo beach", "fyzabad", "union hall", "siparia market",
    "dogpatch", "tableland junction", "moruga road", "moruga",
    "williamsville", "quinam", "quinam road", "harrison trace",
    "corosal junction", "barrackpore junction", "st mary's village",
    "debe junction", "debe market", "mcbean junction",
    "lengua junction", "barrackpore market", "southern main road sf",
    "sobo junction", "erin", "erin bay", "thick village road",
    "bonasse village", "irois", "constance trace", "naparima trace",
    "union road", "pepper village", "hermitage junction",
    // extra south areas
    "mayaro", "guayaguayare", "cocos bay", "naparima mayaro",
    "dow village", "siparia old road", "pinto road", "pinto",
    "la lune village", "rambert village", "bronte village",
    "palo seco road", "brighton lake", "pitch lake la brea",
    "fullarton", "victoria trace", "mon chagrin road",
    "paradise pasture", "gulf view south", "pleasantville south",
    "paradise hill", "corinth village", "harmony hall south",
    "la fortune road", "bamboo village", "ste madeleine road",
    "navet village", "corosal road", "rancho quemado village",
    "vistabella road", "upper coora road", "lower coora road",
    "san francique", "santa flora south", "monkey town south",
    "convert village", "california south village",
    "guayaguayare road", "radix village", "basse terre south",
    "parrylands sf", "rushworth street sf", "coffee street sf",
    "high street sf", "harris promenade sf", "gulf city sf",
    "mon repos sf", "paradise sf", "pleasantville sf",
    "cross crossing sf", "les efforts sf", "rio claro",
    // stadiums & sports (south)
    "tarouba", "brian lara stadium", "brian lara cricket",
    "national cricket centre tarouba", "blia",
    "skinner park sf",
    // popular leisure / tourist (south)
    "pitch lake", "la brea pitch", "brighton beach",
    "guapo beach", "erin beach", "icacos beach",
    "gulf city mall sf", "gulf city san fernando", "south park mall",
    "southern sales", "pennywise sf", "nlcb south",
    // healthcare (south)
    "san fernando general hospital", "sfgh",
    "naparima general hospital", "naparima hospital",
    "penal district hospital", "siparia district hospital",
    "south west regional health", "princes town hospital",
    // tourist/heritage
    "devils woodyard", "devil's woodyard", "moruga museum",
    "siparia la divina pastora", "la divina pastora",
  ].some(k => loc.includes(k));
}

function fmtFare(amount: number): string {
  return `TTD ${formatMoney(amount)}`;
}
function getMinDatetime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
}
function vehicleForPax(pax: number, numberBuses = 1): string {
  if (numberBuses > 1) return `${numberBuses === 5 ? "5+" : numberBuses} × 15-Seater Maxi`;
  return pax <= 12 ? "12-Seater Maxi" : "15-Seater Maxi";
}
function paxLabel(pax: number, numberBuses = 1): string {
  return `${pax} passenger${pax !== 1 ? "s" : ""} · ${vehicleForPax(pax, numberBuses)}`;
}
function fmtDt(dt: string) {
  return new Date(dt).toLocaleString("en-TT", {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Components ──────────────────────────────────────────────────────────────

function CopyableRef({ bookingId }: { bookingId: string }) {
  const [copied, setCopied] = useState(false);

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
      <div className="flex items-start gap-2 rounded-xl border-2 border-amber-400 bg-amber-400/15 px-3 py-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-amber-300 leading-snug">
          Save this reference — it's the <span className="underline underline-offset-2">only</span> way to track your booking once you leave this screen.
        </p>
      </div>

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

function LiveStatusBadge({ jobId }: { jobId: string }) {
  const { data: job } = useGetJob(jobId, {
    query: { queryKey: getGetJobQueryKey(jobId), enabled: !!jobId, refetchInterval: 5000 },
  });

  const status = job?.status ?? "pending";
  const configs: Record<string, { label: string; color: string; dot: string }> = {
    pending:          { label: "Awaiting Driver",    color: "text-amber-700 bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse" },
    pending_deposit:  { label: "Awaiting Deposit",   color: "text-yellow-700 bg-yellow-50 border-yellow-200",dot: "bg-yellow-400 animate-pulse" },
    deposit_received: { label: "Ready for Driver",   color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500 animate-pulse" },
    driver_assigned:  { label: "Driver Assigned",    color: "text-teal-700 bg-teal-50 border-teal-200",     dot: "bg-teal-500" },
    driver_en_route:  { label: "Driver En Route",    color: "text-blue-700 bg-blue-50 border-blue-200",     dot: "bg-blue-500 animate-pulse" },
    claimed:          { label: "Driver Assigned",    color: "text-teal-700 bg-teal-50 border-teal-200",     dot: "bg-teal-500" },
    completed:        { label: "Completed",          color: "text-gray-600 bg-gray-50 border-gray-300",     dot: "bg-gray-400" },
    cancelled:        { label: "Cancelled",          color: "text-red-700 bg-red-50 border-red-200",        dot: "bg-red-400" },
    expired:          { label: "Booking Expired",    color: "text-gray-500 bg-gray-50 border-gray-200",     dot: "bg-gray-300" },
  };
  const cfg = configs[status] ?? configs["pending_deposit"];
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              s <= (hovered || value) ? "text-amber-400 fill-amber-400" : "text-teal-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function BookingLookup() {
  const [refInput, setRefInput] = useState("");
  const [searchId, setSearchId] = useState("");
  const qc = useQueryClient();
  const { data: job, isLoading, isError } = useGetJob(searchId, {
    query: { queryKey: getGetJobQueryKey(searchId), enabled: !!searchId },
  });

  // Rating state
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  // Reset rating UI when a new job is looked up
  const prevJobId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (job?.id !== prevJobId.current) {
      setRatingValue(0);
      setRatingComment("");
      setRatingDone(false);
      setRatingError(null);
      prevJobId.current = job?.id;
    }
  }, [job?.id]);

  async function handleSubmitRating() {
    if (!job || ratingValue < 1) return;
    setRatingSubmitting(true);
    setRatingError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment || undefined }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to submit rating");
      }
      setRatingDone(true);
      qc.invalidateQueries({ queryKey: getGetJobQueryKey(searchId) });
    } catch (e) {
      setRatingError((e as Error).message);
    }
    setRatingSubmitting(false);
  }

  const hasDriver = job?.claimedBy && ["claimed", "driver_en_route", "driver_assigned"].includes(job.status ?? "");
  const alreadyRated = job?.rating != null;

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

              {/* Driver profile card — shown when driver assigned/en-route */}
              {hasDriver && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                      {job.status === "driver_en_route" ? "Driver En Route" : "Driver Assigned"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-teal-900 text-sm">{job.claimedBy}</p>
                      {(job.vehicleType || job.numberPlate) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Car className="w-3 h-3 text-teal-500 shrink-0" />
                          <p className="text-teal-600 text-xs">
                            {[job.vehicleType, job.numberPlate].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {job.status === "driver_en_route" && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <span className="text-blue-500 text-xs font-semibold">🚐 Your driver is on the way!</span>
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

              {/* Rating UI — only for completed, unrated jobs */}
              {job.status === "completed" && !alreadyRated && !ratingDone && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-4 space-y-3">
                  <p className="text-sm font-black text-teal-900">How was your ride?</p>
                  <StarRating value={ratingValue} onChange={setRatingValue} />
                  <textarea
                    placeholder="Leave a comment (optional)"
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-teal-900 text-xs placeholder:text-teal-400 focus:border-teal-500 focus:outline-none resize-none"
                  />
                  {ratingError && (
                    <p className="text-xs text-red-600">{ratingError}</p>
                  )}
                  <button
                    onClick={handleSubmitRating}
                    disabled={ratingValue < 1 || ratingSubmitting}
                    className="w-full py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}
                  >
                    {ratingSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit Rating"}
                  </button>
                </div>
              )}

              {/* Already rated */}
              {job.status === "completed" && (alreadyRated || ratingDone) && (
                <div className="border border-teal-200 bg-teal-50 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <p className="text-xs font-semibold text-teal-700">Thanks for your rating!</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= (job.rating ?? ratingValue) ? "text-amber-400 fill-amber-400" : "text-teal-300"}`}
                      />
                    ))}
                  </div>
                  {(job.ratingComment || ratingComment) && (
                    <p className="text-xs text-teal-700 italic">"{job.ratingComment ?? ratingComment}"</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    {
      q: "What areas do you cover?",
      a: "We operate across all of Trinidad & Tobago — from Port of Spain and Piarco Airport to San Fernando, Chaguanas, Arima, Maracas Bay, Las Cuevas, Mayaro, Icacos, Paramin, and more. If you're unsure, WhatsApp us and we'll confirm.",
    },
    {
      q: "How does payment work?",
      a: "A deposit (usually 25% of the fare) is collected via bank transfer or cash to secure your booking. The remaining balance is paid directly to your driver on the day of the trip. For urgent bookings, full payment is required upfront.",
    },
    {
      q: "Can I book a round trip?",
      a: "Yes — both one-way and same-day round trips are available through the booking form. For overnight or multi-day arrangements, contact us directly on WhatsApp for a custom quote.",
    },
    {
      q: "What vehicle types do you have?",
      a: "We have 8-seater and 12-seater maxi taxis for standard group bookings, 15-seater and 22-seater buses for larger groups, and luxury SUVs for premium hire. The vehicle type is automatically matched to your passenger count.",
    },
    {
      q: "Do you handle airport pickups and drop-offs?",
      a: "Yes — Piarco International Airport runs are one of our most popular services. When you enter 'Airport' or 'Piarco' as your pickup or dropoff, you'll be prompted for your flight number and terminal so we can time your pickup perfectly.",
    },
    {
      q: "What if I need to cancel or change my booking?",
      a: "Please contact us as soon as possible via WhatsApp. Cancellations made with sufficient notice are handled on a case-by-case basis. Deposits may be non-refundable for same-day or urgent cancellations.",
    },
    {
      q: "How do I know my driver is on the way?",
      a: "Once a driver claims your booking, you'll receive a call or WhatsApp message directly from them. You can also track your booking status in real time using the 'Track Your Booking' section on this page.",
    },
  ];

  return (
    <section className="py-16 px-6 md:px-12 bg-[#FFFBF4]">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
          <h2 className="text-3xl font-black text-teal-900 mb-2">Frequently Asked Questions</h2>
          <p className="text-teal-700/70 text-sm">Everything you need to know before you book.</p>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl border border-teal-100 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-teal-50/50 transition-colors"
              >
                <span className="text-sm font-bold text-teal-900">{faq.q}</span>
                <ChevronRight className={`w-4 h-4 text-teal-500 shrink-0 transition-transform duration-200 ${open === i ? "rotate-90" : ""}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-4 border-t border-teal-50">
                  <p className="text-sm text-teal-700 leading-relaxed pt-3">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="text-sm text-teal-700/70 mb-3">Still have questions?</p>
          <a
            href="https://wa.me/18684818039?text=Hi%20Maxi%20Hub%20TT%2C%20I%20have%20a%20question%20about%20booking."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="w-4 h-4" />
            Ask us on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

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

function ExpiryCountdown({ expiresAt }: { expiresAt: string | null | undefined }) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    function update() {
      const remaining = new Date(expiresAt!).getTime() - Date.now();
      if (remaining <= 0) { setTimeLeft("Expired"); return; }
      const totalSecs = Math.floor(remaining / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || !timeLeft) return null;

  const isExpired = timeLeft === "Expired";
  const isUrgent = (() => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    return remaining < 10 * 60 * 1000; // < 10 mins
  })();

  return (
    <div className={`rounded-2xl border-2 px-4 py-3 text-center ${
      isExpired ? "border-red-500/30 bg-red-500/10" :
      isUrgent  ? "border-red-400/40 bg-red-400/10 animate-pulse" :
                  "border-amber-400/40 bg-amber-400/10"
    }`}>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300/80 mb-1">
        {isExpired ? "Booking Expired" : "Deposit Window Closes In"}
      </p>
      <p className={`text-3xl font-black font-mono leading-none ${
        isExpired ? "text-red-400" : isUrgent ? "text-red-300" : "text-amber-300"
      }`}>
        {timeLeft}
      </p>
      {!isExpired && (
        <p className="text-xs text-teal-400/70 mt-1">Contact us now to secure your booking</p>
      )}
    </div>
  );
}

function ConfirmedScreen({
  job,
  onReset,
}: {
  job: { id: string; name: string; phone: string; pickup: string; dropoff: string; fare: number; deposit: number; pickupDatetime: string; returnDatetime: string; tripType: string; expiresAt?: string | null; urgency?: string };
  onReset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-8 pb-16 px-4"
      style={{ fontFamily: "'Outfit', sans-serif", background: "linear-gradient(160deg, #0a2e21 0%, #0f3d2e 50%, #1a5c42 100%)" }}
    >
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="rounded-xl shadow-xl overflow-hidden bg-white" style={{ width: 80, height: 80 }}>
          <img src="/logo-raw.png" alt="Maxi Hub TT" style={{ width: 80, height: 80, objectFit: "cover" }} />
        </div>
        <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">Maxi Hub TT</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-400/20 border-2 border-green-400/40 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Booking Confirmed!</h2>
          <p className="text-teal-300 text-sm mt-1">
            Hey <strong className="text-white">{job.name.split(" ")[0]}</strong>, you're all set.
          </p>
        </div>

        <div className="flex justify-center mb-5">
          <LiveStatusBadge jobId={job.id} />
        </div>

        <CopyableRef bookingId={job.id} />

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

        {/* Urgency badge */}
        {job.urgency === "urgent" && (
          <div className="mt-4 rounded-2xl border-2 border-red-500/40 bg-red-500/15 px-4 py-3">
            <p className="text-red-300 text-sm font-black">⚡ Urgent Booking</p>
            <p className="text-red-200/80 text-xs mt-1">Full payment + rush fee required. Our team will contact you immediately.</p>
          </div>
        )}
        {job.urgency === "same_day" && (
          <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
            <p className="text-amber-300 text-sm font-bold">🕐 Same-Day Booking</p>
            <p className="text-amber-200/80 text-xs mt-1">Deposit must be received promptly to confirm your driver.</p>
          </div>
        )}

        {/* Expiry countdown */}
        {job.expiresAt && (
          <div className="mt-4">
            <ExpiryCountdown expiresAt={job.expiresAt} />
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 px-4 py-4">
          <p className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-1">Deposit Due to Confirm</p>
          {job.deposit > 0 ? (
            <>
              <p className="text-amber-400 text-3xl font-black leading-none">TTD {job.deposit.toLocaleString("en-TT")}</p>
              <p className="text-teal-400 text-xs mt-2 leading-relaxed">
                Total fare: <strong className="text-white">TTD {job.fare.toLocaleString("en-TT")}</strong> — balance of TTD {(job.fare - job.deposit).toLocaleString("en-TT")} paid to your driver on the day.
              </p>
            </>
          ) : (
            <p className="text-amber-300 text-sm mt-1 leading-relaxed">Our team will confirm your exact fare and deposit via WhatsApp shortly.</p>
          )}
        </div>

        <div className="mt-4 flex gap-3 items-start bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <Info className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
          <p className="text-teal-300 text-xs leading-relaxed">
            Our team will contact you shortly to collect the deposit and confirm your driver.
          </p>
        </div>

        <a
          href={`https://wa.me/${job.phone?.replace(/\D/g, "") || "18684818039"}?text=${encodeURIComponent(
            `Hi! Here's my Maxi Hub TT booking summary:\n\n` +
            `📋 Ref: ${job.id}\n` +
            `📍 From: ${job.pickup}\n` +
            `📍 To: ${job.dropoff}\n` +
            `📅 Pickup: ${fmtDt(job.pickupDatetime)}\n` +
            `💰 Fare: TTD ${job.fare.toLocaleString("en-TT")}\n` +
            `💳 Deposit: TTD ${job.deposit.toLocaleString("en-TT")}\n\n` +
            `Saving this for my records.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full h-12 rounded-xl text-sm font-black text-white transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          style={{ background: "#25D366" }}
        >
          <MessageCircle className="w-4 h-4" />
          Save to WhatsApp
        </a>

        <button
          onClick={onReset}
          className="mt-3 w-full h-12 rounded-xl text-sm font-black text-teal-900 transition-all active:scale-[0.97]"
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
  const [bookingConfig, setBookingConfig] = useState<BookingConfig>(DEFAULT_BOOKING_CONFIG);

  useEffect(() => {
    fetchBookingConfig().then(setBookingConfig).catch(() => {});
  }, []);

  // Step 0 — Route
  const [pickup, setPickup]   = useState("");
  const [dropoff, setDropoff] = useState("");
  // Step 1 — Details
  const [tripType, setTripType]               = useState<"one-way" | "round" | null>(null);
  const [pax, setPax]                         = useState(8);
  const [numberBuses, setNumberBuses]         = useState<1 | 2 | 3 | 4 | 5>(1);
  const [pickupDatetime, setPickupDatetime]   = useState("");
  const [returnDatetime, setReturnDatetime]   = useState("");
  const [datetimeError, setDatetimeError]     = useState("");
  const [returnDatetimeError, setReturnDatetimeError] = useState("");
  const [returnDifferentDay, setReturnDifferentDay]   = useState(false);

  // Airport extras (shown when route involves airport)
  const [flightNumber, setFlightNumber] = useState("");
  const [arrDepType, setArrDepType]     = useState<"arrival" | "departure">("arrival");
  const [terminal, setTerminal]         = useState("");

  const isAirportRoute = useMemo(() => {
    return resolveLocation(pickup).group === "airport" || resolveLocation(dropoff).group === "airport";
  }, [pickup, dropoff]);
  const isParaminRoute = useMemo(() => {
    return resolveLocation(pickup).group === "paramin" || resolveLocation(dropoff).group === "paramin";
  }, [pickup, dropoff]);

  // Step 2 — Contact
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2b — Notes
  const [notes, setNotes] = useState("");

  // Pre-fill name/phone from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("maxihub_contact");
      if (saved) {
        const { name: n, phone: p, email: e } = JSON.parse(saved) as { name: string; phone: string; email?: string };
        if (n) setName(n);
        if (p) setPhone(p);
        if (e) setEmail(e);
      }
    } catch {}
  }, []);

  // Step 3 — T&C agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Booking result
  const [bookedJob, setBookedJob] = useState<{
    id: string; name: string; phone: string; pickup: string; dropoff: string;
    fare: number; deposit: number; pickupDatetime: string; returnDatetime: string; tripType: string;
    expiresAt?: string | null; urgency?: string;
  } | null>(null);

  const [stepErrors, setStepErrors] = useState(false);

  const queryClient = useQueryClient();
  const createJob   = useCreateJob();

  const fareResult = useMemo(() => {
    if (!pickup.trim() || !dropoff.trim() || !tripType) return null;
    return calculateFare({
      pickup,
      dropoff,
      tripType,
      passengerCount: pax,
      numberBuses,
      pickupDatetime: pickupDatetime || null,
      depositPct: bookingConfig.deposit_pct,
      rushFee: bookingConfig.rush_fee,
      sameDayMinHours: bookingConfig.same_day_min_hours,
      minBookingHours: bookingConfig.min_booking_hours,
    });
  }, [pickup, dropoff, tripType, pax, numberBuses, pickupDatetime, bookingConfig]);
  const displayFare = fareResult?.status === "approved" ? fareResult.totalFare : null;
  const deposit = fareResult?.status === "approved" ? fareResult.deposit : null;
  const urgencyTier = fareResult?.urgency ?? null;
  const minimumBusCount = minimumBuses(pax, isParaminRoute ? "paramin" : "standard");
  const capacityError = !hasSufficientBusCapacity(pax, numberBuses, isParaminRoute ? "paramin" : "standard")
    ? isParaminRoute
      ? "Not enough buses selected for Paramin. Paramin bookings are limited to a maximum of 10 passengers per bus due to the steep terrain."
      : "Not enough buses selected. Please select enough buses to accommodate all passengers."
    : "";

  const validateDatetime = (value: string) => {
    if (!value) { setDatetimeError(""); return; }
    const selected = new Date(value);
    const minTime  = new Date();
    minTime.setHours(minTime.getHours() + 1);
    setDatetimeError(selected < minTime ? "Pickup must be at least 1 hour from now." : "");
  };

  const validateReturnDatetime = (pickup: string, ret: string) => {
    if (!ret) { setReturnDatetimeError(""); setReturnDifferentDay(false); return; }
    if (!pickup) { setReturnDatetimeError("Set a pickup time first."); setReturnDifferentDay(false); return; }
    if (new Date(ret) <= new Date(pickup)) {
      setReturnDatetimeError("Return must be after pickup.");
      setReturnDifferentDay(false);
      return;
    }
    // Check same-day: compare YYYY-MM-DD portion of the datetime-local strings
    const pickupDay = pickup.slice(0, 10);
    const returnDay = ret.slice(0, 10);
    if (pickupDay !== returnDay) {
      setReturnDifferentDay(true);
      setReturnDatetimeError("");
    } else {
      setReturnDifferentDay(false);
      setReturnDatetimeError("");
    }
  };

  const canAdvanceStep0 = pickup.trim() !== "" && dropoff.trim() !== "";
  const canAdvanceStep1 =
    tripType !== null &&
    pickupDatetime !== "" &&
    !datetimeError &&
    !capacityError &&
    (tripType !== "round" || (returnDatetime !== "" && !returnDatetimeError && !returnDifferentDay));
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
    if (!agreedToTerms) { setStepErrors(true); return; }

    // Save name/phone for future visits
    try { localStorage.setItem("maxihub_contact", JSON.stringify({ name, phone, email })); } catch {}

    const tripLabel = tripType === "round" ? "Round Trip" : "One Way";
    const passengerDesc = paxLabel(pax, numberBuses);
    const returnNote = tripType === "round" && returnDatetime ? ` | Return: ${returnDatetime}` : "";
    const fareLabel = fareResult?.status === "approved" ? fmtFare(fareResult.totalFare) : "CUSTOM QUOTE REQUIRED";
    const priceNote = `${fareLabel} (${tripLabel}, ${passengerDesc}) — Pickup: ${pickupDatetime}${returnNote}`;

    // Build notes string — combine airport info + freeform notes
    const airportNote = isAirportRoute && flightNumber
      ? `Flight: ${flightNumber} (${arrDepType})${terminal ? `, ${terminal}` : ""}`
      : "";
    const fullNotes = [airportNote, notes.trim()].filter(Boolean).join(" | ") || null;

    createJob.mutate(
      { data: { pickup, dropoff, name, phone, price: priceNote, passengers: passengerDesc, passengerCount: pax, numberBuses, tripType, pickupDatetime: pickupDatetime || undefined, ...(email.trim() ? { email: email.trim() } : {}), ...(fullNotes ? { notes: fullNotes } : {}) } },
      {
        onSuccess: job => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
          const jobAny = job as typeof job & { expiresAt?: string | null; urgency?: string };
          setBookedJob({ id: job.id, name, phone, pickup, dropoff, fare: Number(jobAny.totalFare ?? displayFare ?? 0), deposit: Number(jobAny.depositAmount ?? deposit ?? 0), pickupDatetime, returnDatetime, tripType, expiresAt: jobAny.expiresAt ?? null, urgency: jobAny.urgency ?? "standard" });
        },
      }
    );
  }

  function resetAll() {
    setStep(0);
    setPickup(""); setDropoff("");
    setTripType(null); setPax(8); setNumberBuses(1);
    setPickupDatetime(""); setReturnDatetime(""); setDatetimeError(""); setReturnDatetimeError(""); setReturnDifferentDay(false);
    setFlightNumber(""); setArrDepType("arrival"); setTerminal("");
    setName(""); setPhone(""); setEmail("");
    setNotes("");
    setAgreedToTerms(false);
    setBookedJob(null);
    setStepErrors(false);
  }


  if (bookedJob) {
    return <ConfirmedScreen job={bookedJob} onReset={resetAll} />;
  }

  return (
    <div className="min-h-screen bg-[#FFFBF4] text-teal-950" style={{ fontFamily: "'Outfit', sans-serif" }}>

      <header style={{ background: "linear-gradient(90deg, #0f3d2e 0%, #1a5c42 60%, #0f3d2e 100%)" }} className="text-amber-50 shadow-lg">
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ce1126 0%, #000 40%, #ce1126 100%)" }} />
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg overflow-hidden shadow-lg shrink-0 bg-white" style={{ width: 52, height: 52 }}>
              <img src="/logo-raw.png" alt="Maxi Hub TT logo" style={{ width: 52, height: 52, objectFit: "cover" }} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Maxi Hub TT</h1>
              <p className="text-xs text-amber-300 font-medium tracking-widest uppercase">Premium Shuttle Service</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-teal-100">
            <a href="/about" className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">About</a>
            <span className="mx-1 text-amber-400">✦</span>
            <a href="/pricing" className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">Pricing</a>
            <span className="mx-1 text-amber-400">✦</span>
            <a href="/fleet" className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">Fleet</a>
          </nav>
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
        <div className="flex md:hidden items-center justify-center gap-2 px-6 py-2 border-t border-white/10" style={{ background: "rgba(0,0,0,0.1)" }}>
          <a href="/about" className="bg-white/10 px-3 py-1 rounded-full border border-white/20 text-xs font-bold text-teal-100 hover:bg-white/20 transition-colors">About</a>
          <span className="text-amber-400 text-xs">✦</span>
          <a href="/pricing" className="bg-white/10 px-3 py-1 rounded-full border border-white/20 text-xs font-bold text-teal-100 hover:bg-white/20 transition-colors">Pricing</a>
          <span className="text-amber-400 text-xs">✦</span>
          <a href="/fleet" className="bg-white/10 px-3 py-1 rounded-full border border-white/20 text-xs font-bold text-teal-100 hover:bg-white/20 transition-colors">Fleet</a>
        </div>
        <div className="border-t border-white/10 py-2 text-center" style={{ background: "rgba(0,0,0,0.15)" }}>
          <p className="text-xs text-amber-200 font-medium tracking-widest uppercase">🌴 &nbsp; Safe. Smooth. On Time. That's How We Roll. &nbsp; 🌴</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-12 pb-20">
        <div className="relative">
          <div className="h-[30vh] lg:h-full w-full overflow-hidden relative">
            <img src="/maxi-hero.png" alt="Maxi taxi in Trinidad" className="w-full h-full object-cover object-center absolute inset-0" />
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
                Premium private hire for individuals, groups, airport runs, beach trips & events. No haggling — transparent rates, real reliability.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Airport Runs", "Beach Limes", "Group Events", "Corporate"].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-900/10 text-teal-800 border border-teal-200">{tag}</span>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-teal-200/40 flex flex-wrap items-center gap-x-4 gap-y-1">
                <a href="tel:+18684818039" className="flex items-center gap-1.5 text-sm font-black text-teal-900 hover:text-amber-700 transition-colors">
                  <Phone className="w-4 h-4 text-amber-600" /> (868) 481-8039
                </a>
                <span className="text-teal-300 text-xs hidden sm:block">·</span>
                <span className="flex items-center gap-1 text-xs text-teal-600">
                  <Clock className="w-3.5 h-3.5 text-teal-500" /> Daily 5am – 11pm
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-12 lg:py-10 flex items-start justify-center z-10 relative">
          <div className="w-full max-w-lg bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-amber-900/5 border border-amber-100 overflow-hidden">
            <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126, #f59e0b, #0f3d2e)" }} />

            <ProgressBar step={step} />

            <div className="px-6 pb-6">
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-teal-900">Where are you going?</h2>
                    <p className="text-teal-700/70 text-sm mt-1">Enter your pickup and dropoff locations to get an instant fare estimate.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                        <div className="bg-amber-100 p-1 rounded-full"><MapPin className="w-3.5 h-3.5 text-amber-600" /></div>
                        Pickup Location
                      </label>
                      <input
                        type="text"
                        data-testid="input-pickup"
                         list="location-suggestions"
                        placeholder="e.g. Maracas Bay, POS, Piarco Airport..."
                        className={`w-full h-12 px-4 rounded-xl border-2 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm transition-colors ${stepErrors && !pickup.trim() ? "border-red-400" : "border-teal-100"}`}
                        value={pickup}
                        onChange={e => { setPickup(e.target.value); setStepErrors(false); }}
                      />
                      {stepErrors && !pickup.trim() && <p className="text-xs text-red-600 font-medium">Please enter a pickup location.</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                        <div className="bg-teal-100 p-1 rounded-full"><Navigation className="w-3.5 h-3.5 text-teal-600" /></div>
                        Dropoff Location
                      </label>
                      <input
                        type="text"
                        data-testid="input-dropoff"
                         list="location-suggestions"
                        placeholder="e.g. San Fernando, Chaguanas, Las Cuevas..."
                        className={`w-full h-12 px-4 rounded-xl border-2 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm transition-colors ${stepErrors && !dropoff.trim() ? "border-red-400" : "border-teal-100"}`}
                        value={dropoff}
                        onChange={e => { setDropoff(e.target.value); setStepErrors(false); }}
                      />
                      {stepErrors && !dropoff.trim() && <p className="text-xs text-red-600 font-medium">Please enter a dropoff location.</p>}
                       <datalist id="location-suggestions">
                         {LOCATION_SUGGESTIONS.map(location => <option key={location} value={location} />)}
                       </datalist>
                    </div>
                  </div>

                  {pickup.trim() && dropoff.trim() && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-teal-700">
                      {displayFare ? (
                        <>
                          <p className="text-xs text-teal-500 uppercase tracking-wider mb-1 font-bold">Estimated Fare</p>
                          <p className="text-2xl font-black text-teal-900">from TTD {displayFare.toLocaleString("en-TT")}</p>
                          <p className="text-xs text-teal-500 mt-1">Exact price confirmed after trip details</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-teal-500 uppercase tracking-wider mb-1 font-bold">Fare estimate</p>
                          <p className="text-sm text-teal-600">Your fare will be confirmed via WhatsApp after booking.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-teal-900">Trip details</h2>
                    <p className="text-teal-700/70 text-sm mt-1">Tell us about your journey so we can match the right vehicle.</p>
                  </div>

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

                  <div className="space-y-2">
                    <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                      <Users className="w-3.5 h-3.5 text-teal-600" />
                      Passengers
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border-2 border-teal-100 bg-white px-4 h-12">
                       <button type="button" onClick={() => setPax(p => Math.max(1, p - 1))}
                        className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xl flex items-center justify-center hover:bg-teal-100 transition-colors shrink-0">−</button>
                      <span className="flex-1 text-center text-teal-900 font-black text-lg tabular-nums">{pax}</span>
                       <button type="button" onClick={() => setPax(p => Math.min(100, p + 1))}
                         disabled={pax >= 100}
                        className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xl flex items-center justify-center hover:bg-teal-100 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                    </div>
                      <p className="text-xs text-teal-600/80 font-medium px-1">
                        {vehicleForPax(pax, numberBuses)} · capacity up to {busCapacity(numberBuses, isParaminRoute ? "paramin" : "standard")} passengers
                        {minimumBusCount > 1 && <span> · minimum {minimumBusCount} buses</span>}
                      </p>
                  </div>

                   <div className="space-y-2">
                     <label className="text-teal-900 font-semibold flex items-center gap-2 text-sm">
                       <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                       Number of Buses
                     </label>
                     <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                       {BUS_OPTIONS.map(option => (
                         <button
                           key={option.value}
                           type="button"
                            onClick={() => setNumberBuses(option.value)}
                            className={`h-10 rounded-xl border-2 text-xs font-bold transition-all ${
                             numberBuses === option.value
                               ? "border-amber-500 bg-amber-500 text-white"
                                : option.value < minimumBusCount
                                  ? "border-dashed border-teal-100 bg-teal-50 text-teal-300"
                                  : "border-dashed border-teal-200 bg-white text-teal-700 hover:border-amber-300"
                           }`}
                            aria-disabled={option.value < minimumBusCount}
                            disabled={option.value < minimumBusCount}
                         >
                           {option.label}
                         </button>
                       ))}
                     </div>
                     {capacityError && (
                       <p className="text-xs text-red-600 font-semibold px-1">
                          <span className="block">Not enough buses selected{isParaminRoute ? " for Paramin" : ""}</span>
                          <span className="font-normal">
                            {isParaminRoute
                              ? "Select enough buses for a maximum of 10 passengers per bus."
                              : "Please select enough buses to accommodate all passengers."}
                          </span>
                       </p>
                     )}
                   </div>

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

                  {/* Airport extras */}
                  {isAirportRoute && (
                    <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="bg-sky-100 p-1.5 rounded-lg"><Plane className="w-4 h-4 text-sky-600" /></div>
                        <p className="text-sm font-black text-sky-900">Airport Trip Details</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sky-900 font-semibold text-xs uppercase tracking-wide">Arrival or Departure?</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(["arrival", "departure"] as const).map(t => (
                            <button key={t} type="button"
                              onClick={() => setArrDepType(t)}
                              className={`h-10 rounded-xl border-2 text-sm font-bold transition-all capitalize ${
                                arrDepType === t ? "border-sky-600 bg-sky-600 text-white" : "border-dashed border-sky-300 bg-white text-sky-700 hover:border-sky-400"
                              }`}
                            >{t}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sky-900 font-semibold text-xs uppercase tracking-wide">Flight Number</label>
                        <input type="text" placeholder="e.g. BW103"
                          value={flightNumber}
                          onChange={e => setFlightNumber(e.target.value.toUpperCase())}
                          className="w-full h-10 px-3 rounded-xl border-2 border-sky-200 bg-white text-sky-900 placeholder:text-sky-400 focus:border-sky-500 focus:outline-none text-sm font-mono tracking-wide"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sky-900 font-semibold text-xs uppercase tracking-wide">Terminal <span className="text-sky-400 font-normal normal-case">(optional)</span></label>
                        <input type="text" placeholder="e.g. Terminal 1"
                          value={terminal}
                          onChange={e => setTerminal(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border-2 border-sky-200 bg-white text-sky-900 placeholder:text-sky-400 focus:border-sky-500 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                  )}

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
                            returnDatetimeError || returnDifferentDay || (stepErrors && !returnDatetime) ? "border-red-400" : "border-amber-200 focus:border-amber-400"
                          }`}
                          value={returnDatetime}
                          onChange={e => { setReturnDatetime(e.target.value); validateReturnDatetime(pickupDatetime, e.target.value); setStepErrors(false); }}
                        />
                      </div>
                      {returnDatetimeError && <p className="text-xs text-red-600 font-medium">{returnDatetimeError}</p>}
                      {stepErrors && !returnDatetime && !returnDatetimeError && !returnDifferentDay && (
                        <p className="text-xs text-red-600 font-medium">Please set a return date and time.</p>
                      )}
                      {returnDifferentDay && (
                        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 space-y-2.5">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-amber-800">Return must be on the same day</p>
                              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                                For overnight or multi-day trips, please contact us directly on WhatsApp to arrange a custom booking.
                              </p>
                            </div>
                          </div>
                          <a
                            href={waLink(
                              `Hi Maxi Hub TT, I'd like to arrange a custom booking.\n\nPickup: ${pickup}\nDropoff: ${dropoff}\nOutbound: ${pickupDatetime}\nReturn: ${returnDatetime}\nPassengers: ${pax}`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: "#25D366" }}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Book via WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                   {fareResult && (
                     fareResult.status === "approved" ? (
                       <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-4 space-y-2">
                         <p className="text-xs text-teal-500 uppercase tracking-wider font-bold">Your Maxi Hub TT Fare</p>
                         <div className="grid grid-cols-2 gap-y-1 text-sm">
                           <span className="text-teal-600">Route</span><span className="text-right font-semibold text-teal-900">{fareResult.routeLabel}</span>
                           <span className="text-teal-600">Passengers / buses</span><span className="text-right font-semibold text-teal-900">{pax} / {numberBuses === 5 ? "5+" : numberBuses}</span>
                           <span className="text-teal-600">Trip</span><span className="text-right font-semibold text-teal-900">{tripType === "round" ? "Round trip" : "One-way"}</span>
                            <span className="text-teal-600">Fare per bus</span>
                            <span className="text-right font-semibold text-teal-900">
                              {fareResult.busBreakdown.every(item => item.fare === fareResult.busBreakdown[0]?.fare)
                                ? `${numberBuses === 5 ? "5+" : numberBuses} × ${fmtFare(fareResult.busBreakdown[0]?.fare ?? 0)}`
                                : "See bus breakdown below"}
                            </span>
                            <span className="text-teal-600">Base fare</span><span className="text-right font-semibold text-teal-900">{fmtFare(fareResult.baseFare)}</span>
                            {!fareResult.busBreakdown.every(item => item.fare === fareResult.busBreakdown[0]?.fare) && (
                              <>
                                <span className="text-teal-600">Bus breakdown</span>
                                <span className="text-right font-semibold text-teal-900">
                                  {fareResult.busBreakdown.map(item => `Bus ${item.bus}: ${item.passengerCount} pax × ${fmtFare(item.fare)}`).join(" · ")}
                                </span>
                              </>
                            )}
                           <span className="text-teal-600">Rush fee</span><span className={`text-right font-semibold ${fareResult.rushFee ? "text-red-600" : "text-teal-900"}`}>{fmtFare(fareResult.rushFee)}</span>
                           <span className="text-teal-900 font-bold pt-2 border-t border-amber-200">Total</span><span className="text-right font-black text-teal-900 pt-2 border-t border-amber-200">{fmtFare(fareResult.totalFare)}</span>
                           <span className="text-teal-900 font-bold">Deposit</span><span className="text-right font-black text-amber-700">{fmtFare(fareResult.deposit)}</span>
                         </div>
                       </div>
                     ) : fareResult.status === "invalid" ? (
                       <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">{fareResult.message}</div>
                     ) : (
                       <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4 space-y-3">
                         <div>
                           <p className="text-sm font-black text-teal-900 uppercase tracking-wide">Custom Quote Required</p>
                           <p className="text-xs text-teal-700 mt-1 leading-relaxed">{fareResult.message}</p>
                         </div>
                         <a href={waLink(`Hi Maxi Hub TT, I'd like a customized quote.\n\nPickup: ${pickup}\nDropoff: ${dropoff}\nPassengers: ${pax}\nBuses: ${numberBuses === 5 ? "5+" : numberBuses}\nTrip: ${tripType === "round" ? "Round trip" : "One way"}`)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ background: "#25D366" }}>
                           <MessageCircle className="w-4 h-4" /> Request Quote on WhatsApp
                         </a>
                         <p className="text-[11px] text-teal-600 text-center">You can continue below and submit a quote request for our team to follow up.</p>
                       </div>
                     )
                   )}

                  {/* Urgency tier banner */}
                  {urgencyTier === "urgent" && pickupDatetime && (
                    <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 space-y-1">
                      <p className="text-sm font-black text-red-700">⚡ Urgent Booking — Full Payment Required</p>
                      <p className="text-xs text-red-600 leading-relaxed">
                        Pickups within {bookingConfig.same_day_min_hours} hour{bookingConfig.same_day_min_hours !== 1 ? "s" : ""} require full payment{bookingConfig.rush_fee > 0 ? ` plus a rush fee (TTD ${bookingConfig.rush_fee.toLocaleString("en-TT")})` : ""}. Our team will contact you immediately after booking.
                      </p>
                    </div>
                  )}
                  {urgencyTier === "same_day" && pickupDatetime && (
                    <div className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 space-y-1">
                      <p className="text-sm font-bold text-amber-800">🕐 Same-Day Booking</p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Pickup within {bookingConfig.min_booking_hours} hours. A {bookingConfig.deposit_pct}% deposit is required promptly to confirm your driver — please keep your phone nearby.
                      </p>
                    </div>
                  )}
                </div>
              )}

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

                  <div className="space-y-1.5">
                    <label className="text-teal-900 font-semibold text-sm flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-teal-600" />
                      Email Address <span className="text-teal-400 font-normal text-xs">(optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. kezia@example.com"
                      className="w-full h-12 px-4 rounded-xl border-2 border-teal-100 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm transition-colors"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-teal-900 font-semibold text-sm flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-teal-600" />
                      Special Requests <span className="text-teal-400 font-normal text-xs">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Please arrive 10 mins early, we have large luggage, wheelchair accessible vehicle needed..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-teal-100 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm resize-none leading-relaxed"
                    />
                  </div>

                  <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex gap-3 items-start">
                    <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-teal-700 leading-relaxed">
                      We'll contact you on this number to collect your deposit and confirm your driver. Keep your phone nearby.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-black text-teal-900">Review your booking</h2>
                    <p className="text-teal-700/70 text-sm mt-1">Everything look right? Hit confirm to lock in your ride.</p>
                  </div>

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
                        <p className="font-semibold text-teal-900">{tripType === "round" ? "Round Trip" : "One Way"} · {pax} passenger{pax !== 1 ? "s" : ""} · {vehicleForPax(pax, numberBuses)}</p>
                        <p className="text-xs text-teal-600 mt-1">Buses: {numberBuses === 5 ? "5+" : numberBuses}</p>
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
                        {email && <p className="text-xs text-teal-600">{email}</p>}
                      </div>
                    </div>
                  </div>

                   <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                     {fareResult?.status === "approved" ? (
                       <>
                         <div className="flex justify-between items-center gap-3">
                           <div className="min-w-0">
                             <p className="text-sm font-semibold text-teal-800">Final Fare</p>
                             <p className="text-xs text-teal-600">{tripType === "round" ? "Round trip" : "One way"} · {paxLabel(pax, numberBuses)}</p>
                           </div>
                           <p className="text-2xl font-black text-teal-900 shrink-0">{fmtFare(fareResult.totalFare)}</p>
                         </div>
                         <div className="bg-white/70 border border-amber-100 rounded-xl px-3 py-2.5 flex gap-3 items-start">
                           <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                           <div>
                             <p className="text-sm font-bold text-teal-900">{bookingConfig.deposit_pct}% Deposit: {fmtFare(fareResult.deposit)}</p>
                             <p className="text-xs text-teal-700/80 mt-0.5">Base fare {fmtFare(fareResult.baseFare)} + rush fee {fmtFare(fareResult.rushFee)} = total {fmtFare(fareResult.totalFare)}. Balance of {fmtFare(fareResult.totalFare - fareResult.deposit)} is paid to your driver on the day.</p>
                           </div>
                         </div>
                       </>
                     ) : (
                       <div>
                         <p className="text-sm font-black text-teal-900">Custom Quote Required</p>
                         <p className="text-xs text-teal-700 mt-1 leading-relaxed">{fareResult?.message ?? "Our team will confirm your exact fare and deposit by WhatsApp after booking."}</p>
                       </div>
                     )}
                   </div>

                  <label className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${agreedToTerms ? "border-teal-400 bg-teal-50/60" : stepErrors && !agreedToTerms ? "border-red-400 bg-red-50/40" : "border-teal-100 bg-white"}`}>
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => { setAgreedToTerms(e.target.checked); setStepErrors(false); }}
                      className="mt-0.5 w-4 h-4 accent-teal-700 shrink-0"
                    />
                    <span className="text-xs text-teal-700 leading-relaxed">
                      I have read and agree to the{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-700 font-bold underline underline-offset-2 hover:text-teal-900"
                        onClick={e => e.stopPropagation()}
                      >
                        Passenger Terms &amp; Conditions
                      </a>
                    </span>
                  </label>
                  {stepErrors && !agreedToTerms && (
                    <p className="text-xs text-red-600 font-medium -mt-2">You must agree to the Terms &amp; Conditions to confirm your booking.</p>
                  )}

                  {createJob.isError && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
                      <p className="font-semibold">Booking failed — please try again.</p>
                      <p className="text-red-500 text-xs">
                        {createJob.error instanceof Error ? createJob.error.message : "Unknown error"}
                      </p>
                      <p className="text-red-400 text-xs">
                        If this keeps happening, reach us on{" "}
                        <a href="https://wa.me/18684818039" className="underline font-medium">WhatsApp</a>.
                      </p>
                    </div>
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
                       : deposit
                       ? <><CheckCircle2 className="w-5 h-5" /> Confirm Booking &mdash; {fmtFare(deposit)} deposit</>
                       : <><MessageCircle className="w-5 h-5" /> Continue With Quote Request</>}
                  </button>
                </div>
              )}

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

      <section className="py-3 px-4 border-b border-teal-800/50" style={{ background: "#0a2318" }}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="tel:+18684818039" className="flex items-center gap-1.5 text-xs font-black text-white hover:text-amber-300 transition-colors">
            <Phone className="w-3.5 h-3.5 text-amber-400" /> (868) 481-8039
          </a>
          <span className="text-white/20 hidden sm:block">|</span>
          <span className="flex items-center gap-1.5 text-xs text-teal-300">⚡ Avg. 5-min WhatsApp reply</span>
          <span className="text-white/20 hidden sm:block">|</span>
          <span className="flex items-center gap-1.5 text-xs text-teal-300">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> 4.9 / 5 customer rating
          </span>
          <span className="text-white/20 hidden sm:block">|</span>
          <span className="flex items-center gap-1.5 text-xs text-teal-300">🛡️ Licensed &amp; insured drivers</span>
          <span className="text-white/20 hidden sm:block">|</span>
          <span className="flex items-center gap-1.5 text-xs text-teal-300">
            <Clock className="w-3 h-3 text-amber-400" /> Daily 5am – 11pm
          </span>
        </div>
      </section>

      <section className="py-14 px-6 md:px-12" style={{ background: "linear-gradient(135deg, #0f3d2e 0%, #0a2e21 100%)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Simple Process</p>
            <h2 className="text-3xl font-black text-white">Book in under 2 minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
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

      <section className="py-16 px-6 md:px-12" style={{ background: "linear-gradient(135deg, #0a2e21 0%, #0f3d2e 60%, #0a2e21 100%)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-16 bg-white/20 rounded-full" />
              <span className="text-amber-400 text-lg">⚓</span>
              <div className="h-px flex-1 max-w-16 bg-white/20 rounded-full" />
            </div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">In Partnership with Lucky 13 Island Tours</p>
            <h2 className="text-3xl font-black text-white mb-3">Down d Islands</h2>
            <p className="text-teal-300 text-sm max-w-lg mx-auto leading-relaxed">
              We handle the ride — Lucky 13 handles the boat. Book your maxi transfer to Carenage and a full boat charter to the islands, all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { emoji: "⛵", name: "Gaspar Grande", desc: "Half or full day. Sea caves, calm bay, easy escape closest to POS." },
              { emoji: "🌊", name: "Monos Island",  desc: "T&T's favourite lime. Stunning anchorages, iconic vibes." },
              { emoji: "🏝️", name: "Huevos & Chacachacare", desc: "Outer islands. Dramatic cliffs, crystal water, snorkelling." },
              { emoji: "🗺️", name: "Private Charter", desc: "Your crew, your pace. Custom itinerary for any occasion." },
            ].map(({ emoji, name, desc }) => (
              <div key={name} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-5 flex flex-col gap-2 hover:bg-white/10 transition-colors">
                <span className="text-3xl">{emoji}</span>
                <p className="font-black text-white text-sm leading-tight">{name}</p>
                <p className="text-xs text-teal-300 leading-relaxed flex-1">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/18684818039?text=Hi%20Maxi%20Hub%20TT%2C%20I%27d%20like%20to%20book%20a%20Down%20d%20Islands%20charter%20with%20Lucky%2013.%20Can%20you%20help%3F"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: "#25D366" }}
            >
              <MessageCircle className="w-4 h-4" />
              Book via WhatsApp
            </a>
            <a
              href="/pricing"
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              See All Charter Options →
            </a>
          </div>

          <p className="text-center text-xs text-teal-400/60 mt-5">
            Maxi Hub TT is the official transport partner of Lucky 13 Island Tours.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
            <h2 className="text-3xl font-black text-teal-900 mb-2">What Passengers Are Saying</h2>
            <p className="text-teal-700/70 text-sm">Real riders. Real reviews. Across Trinidad & Tobago.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Kezia M.", area: "Diego Martin", trip: "Maracas Beach Lime", date: "May 2025", stars: 5, text: "Took the whole family to Maracas for my birthday. Driver was on time, maxi was spotless, and the fare was exactly what it said online. Will definitely use again!" },
              { name: "Ravi P.", area: "San Fernando", trip: "Corporate Outing", date: "Apr 2025", stars: 5, text: "Used Maxi Hub TT for our company outing to Chaguanas. Booked the night before and everything was sorted by morning. Professional service all the way." },
              { name: "Anika R.", area: "Arima", trip: "Airport Run – Piarco", date: "Jun 2025", stars: 5, text: "Best airport run I've ever had. Flight landed early and the driver was already waiting. No fuss, no extra charge. This is how it should be done." },
              { name: "Terrence C.", area: "Chaguanas", trip: "Beach Lime (14 pax)", date: "Mar 2025", stars: 5, text: "Used the app to book a beach lime for 14 people. The price was fair and the booking was confirmed in minutes. Driver called us the night before to confirm." },
            ].map(({ name, area, trip, date, stars, text }) => (
              <div key={name} className="rounded-2xl border border-teal-100 bg-[#FFFBF4] p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-black text-teal-900 text-sm">{name}</p>
                        <p className="text-xs text-teal-500">{area} · {date}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: stars }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-teal-800/80 leading-relaxed mb-2">"{text}"</p>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Verified booking
                      </span>
                      <span className="text-xs text-teal-400 font-medium">{trip}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      <BookingLookup />

      <FaqAccordion />

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

      <footer style={{ background: "linear-gradient(180deg, #0f3d2e 0%, #0a2318 100%)" }} className="text-teal-100">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg overflow-hidden bg-white shrink-0" style={{ width: 40, height: 40 }}>
                <img src="/logo-raw.png" alt="Maxi Hub TT" style={{ width: 40, height: 40, objectFit: "cover" }} />
              </div>
              <div>
                <p className="font-black text-white text-sm leading-tight">Maxi Hub TT</p>
                <p className="text-xs text-amber-400 font-semibold">Premium Shuttle Service</p>
              </div>
            </div>
            <p className="text-xs text-teal-300 leading-relaxed mb-4">
              Private hire maxi service across Trinidad & Tobago. Airport runs, beach limes, group events, and corporate transfers — all at transparent, fixed fares.
            </p>
            <div className="flex items-center gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ))}
              <span className="text-xs text-teal-300 ml-1.5 font-semibold">4.9 / 5 · 500+ bookings</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">Quick Links</p>
            <ul className="space-y-2">
              {[
                { label: "Home", href: "/" },
                { label: "About Us", href: "/about" },
                { label: "Pricing & Fares", href: "/pricing" },
                { label: "Our Fleet", href: "/fleet" },
                { label: "Down d Islands", href: "/pricing" },
                { label: "Passenger Terms", href: "/terms" },
                { label: "Driver Terms", href: "/driver/terms" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-xs text-teal-300 hover:text-white transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">Contact Us</p>
            <ul className="space-y-3">
              <li>
                <a href="tel:+18684818039" className="flex items-start gap-2 text-xs text-teal-200 hover:text-white transition-colors group">
                  <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><span className="font-black text-white">(868) 481-8039</span><br />Call or WhatsApp</span>
                </a>
              </li>
              <li>
                <a href={waLink("Hi Maxi Hub TT, I'd like to enquire about a booking.")} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-2 text-xs text-teal-200 hover:text-white transition-colors">
                  <MessageCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><span className="font-black text-white">WhatsApp</span><br />Avg. 5-min reply</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-xs text-teal-200">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><span className="font-black text-white">Operating Hours</span><br />Daily 5:00am – 11:00pm<br />24/7 for airport runs</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-teal-200">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><span className="font-black text-white">Service Area</span><br />All of Trinidad & Tobago</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-4 px-6 text-center">
          <p className="text-xs text-teal-500">© {new Date().getFullYear()} Maxi Hub TT. All rights reserved. Trinidad & Tobago. · Transport partner of <span className="text-teal-400">Lucky 13 Island Tours</span></p>
        </div>
      </footer>

    </div>
  );
}
