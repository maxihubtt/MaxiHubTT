import { useCallback, useMemo, useState } from "react";
import { useCreateJob, useGetJob, getGetJobQueryKey, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Navigation, User, Phone, CheckCircle2, Info, Loader2, Clock, Calendar, Users, ArrowLeftRight, Plane, Waves, Briefcase, Copy, Check, ChevronRight, ChevronLeft, MessageCircle, AlertTriangle } from "lucide-react";

const WA_BASE = "https://wa.me/18684818039?text=";
const waLink = (msg: string) => WA_BASE + encodeURIComponent(msg);

// ── Fare calculation helpers ─────────────────────────────────────────────────

type FareRange = [number, number];

// Normalize user input before zone matching: strip punctuation, expand abbreviations
function normalizeLoc(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,'\u2018\u2019\u201b`]/g, "")   // strip . , ' ' ` etc.
    .replace(/\bmt\b/g, "mount")                  // mt → mount
    .replace(/\bst\b/g, "saint")                  // st → saint (handles "saint james", "saint joseph")
    .replace(/\bsf\b/g, "san fernando")           // sf → san fernando
    .replace(/\bpos\b/g, "port of spain")         // pos → port of spain
    .replace(/\s+/g, " ")
    .trim();
}

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
  ].some(k => loc.includes(k));
}

// Approximate zone center coordinates [lat, lon]
const ZONE_COORDS: Record<ZoneKey, [number, number]> = {
  west:    [10.657, -61.502],
  central: [10.520, -61.414],
  east:    [10.638, -61.284],
  south:   [10.280, -61.468],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate a maxi fare for any two detected zones using road-distance approximation
function estimateFareFromZones(pickup: string, dropoff: string): number | null {
  const pZone = getZone(pickup);
  const dZone = getZone(dropoff);
  if (!pZone || !dZone || pZone === dZone) return null;
  const [pLat, pLon] = ZONE_COORDS[pZone];
  const [dLat, dLon] = ZONE_COORDS[dZone];
  const straightKm = haversineKm(pLat, pLon, dLat, dLon);
  const roadKm = straightKm * 1.4; // road vs straight-line factor for TT
  let fare = 25 + roadKm * 8;
  if (roadKm > 25) fare += 20;
  if (roadKm > 50) fare += 40;
  return Math.round(fare / 50) * 50;
}
function eastSubzone(loc: string): "near" | "mid" | "far" | "toco" {
  const n = normalizeLoc(loc);
  if (["toco", "matelot", "balandra", "saline", "salybia", "brasso seco"].some(k => n.includes(k))) return "toco";
  if (["valencia", "demerara", "sangre grande", "guaico", "tumpuna", "cumana"].some(k => n.includes(k))) return "far";
  if (["san juan", "saint joseph", "curepe", "valsayn", "mount lambert"].some(k => n.includes(k))) return "near";
  return "mid";
}
function southSubzone(loc: string): "close" | "mid" | "far" | "deep" {
  const n = normalizeLoc(loc);
  if (["cedros", "moruga", "icacos", "columbus bay"].some(k => n.includes(k))) return "deep";
  if (["point fortin", "la brea"].some(k => n.includes(k))) return "far";
  if (["penal", "siparia", "fyzabad", "barrackpore", "princes town", "prince town", "rio claro", "debe", "naparima", "williamsville", "tableland"].some(k => n.includes(k))) return "mid";
  return "close";
}
type ZoneKey = "west" | "central" | "east" | "south";
function getZone(loc: string): ZoneKey | null {
  const n = normalizeLoc(loc);
  if (isSouth(n)) return "south";
  if (isEast(n)) return "east";
  if (isCentral(n)) return "central";
  if (isWest(n)) return "west";
  return null;
}

type BeachKey = "maracas" | "las_cuevas" | "blanchisseuse" | "manzanilla" | "mayaro" | "vessigny" | "icacos";
type RegionKey = "west" | "east" | "central" | "south";
// [owLo, owHi, rtLo, rtHi]
const BEACH_RATES: Record<BeachKey, Record<RegionKey, [number, number, number, number]>> = {
  maracas:       { west: [650, 800, 1000, 1200],   east: [750, 900, 1200, 1400],   central: [850, 1050, 1400, 1600],  south: [1200, 1500, 2000, 2400] },
  las_cuevas:    { west: [750, 950, 1200, 1400],   east: [850, 1050, 1400, 1600],  central: [950, 1150, 1600, 1800],  south: [1300, 1600, 2200, 2600] },
  blanchisseuse: { west: [900, 1100, 1500, 1800],  east: [600, 800, 1000, 1200],   central: [1100, 1350, 1800, 2100], south: [1600, 2000, 2600, 3000] },
  manzanilla:    { west: [1200, 1500, 2000, 2400], east: [600, 800, 1000, 1200],   central: [900, 1100, 1500, 1800],  south: [900, 1100, 1500, 1800]  },
  mayaro:        { west: [1400, 1800, 2400, 2800], east: [800, 1000, 1400, 1600],  central: [1000, 1200, 1700, 2000], south: [650, 800, 1100, 1300]   },
  vessigny:      { west: [1100, 1400, 1800, 2100], east: [1300, 1600, 2200, 2600], central: [800, 1000, 1400, 1600],  south: [500, 650, 900, 1100]    },
  icacos:        { west: [1600, 2000, 2600, 3000], east: [1500, 1900, 2600, 3000], central: [1400, 1800, 2400, 2800], south: [800, 1000, 1400, 1600]  },
};
function identifyBeach(loc: string): BeachKey | null {
  const n = normalizeLoc(loc);
  if (n.includes("maracas") || n.includes("tyrico")) return "maracas";
  if (n.includes("las cuevas")) return "las_cuevas";
  if (n.includes("blanchisseuse") || n.includes("paria")) return "blanchisseuse";
  if (n.includes("manzanilla")) return "manzanilla";
  if (n.includes("mayaro")) return "mayaro";
  if (n.includes("vessigny")) return "vessigny";
  if (n.includes("icacos") || n.includes("columbus bay")) return "icacos";
  return null;
}
function identifyRegion(loc: string): RegionKey {
  const n = normalizeLoc(loc);
  if (isSouth(n)) return "south";
  if (isEast(n)) return "east";
  if (isCentral(n)) return "central";
  return "west";
}

const round50 = (n: number) => Math.round(n / 50) * 50;

function getBeachFareRange(pickup: string, dropoff: string, tripType: string): FareRange | null {
  const beach = identifyBeach(dropoff) ?? identifyBeach(pickup);
  if (!beach) return null;
  const origin = identifyBeach(dropoff) !== null ? pickup : dropoff;
  const r = BEACH_RATES[beach][identifyRegion(origin)];
  const rt = tripType === "round";
  const lo = rt ? r[2] : r[0];
  const hi = rt ? r[3] : r[1];
  return [lo, round50(hi * 1.75)]; 
}

function getBeachExactFare(pickup: string, dropoff: string, pax: number, tripType: string): number | null {
  const beach = identifyBeach(dropoff) ?? identifyBeach(pickup);
  if (!beach) return null;
  const origin = identifyBeach(dropoff) !== null ? pickup : dropoff;
  const r = BEACH_RATES[beach][identifyRegion(origin)];
  const rt = tripType === "round";
  const lo = rt ? r[2] : r[0];
  const hi = rt ? r[3] : r[1];
  if (pax <= 12) return lo;
  if (pax <= 15) return hi;
  if (pax <= 18) return round50(hi * 1.25);
  if (pax <= 22) return round50(hi * 1.50);
  return round50(hi * 1.75); 
}

const ROUTE_FARES: Record<string, [number,number,number,number,number, number,number,number,number,number]> = {
  "west-central":      [         480,  650,  800,  950, 1100,   800, 1000, 1250, 1500, 1750],
  "west-east-near":    [         350,  400,  500,  600,  700,   600,  700,  850, 1000, 1150],
  "west-east-mid":     [         480,  520,  650,  800,  950,   800,  900, 1100, 1300, 1500],
  "west-east-far":     [         600,  650,  800,  950, 1100,  1000, 1100, 1350, 1600, 1850],
  "west-east-toco":    [         900, 1000, 1200, 1450, 1650,  1500, 1650, 2000, 2400, 2750],
  "west-south-close":  [         500,  600,  750,  900, 1050,   900, 1000, 1250, 1500, 1750],
  "west-south-mid":    [         650,  800, 1000, 1200, 1400,  1100, 1300, 1600, 1900, 2200],
  "west-south-far":    [         900, 1000, 1200, 1450, 1650,  1500, 1650, 2000, 2400, 2750],
  "west-south-deep":   [        1050, 1150, 1400, 1650, 1900,  1700, 1800, 2200, 2600, 3000],
  "central-crossing":  [         500,  700,  850, 1000, 1200,   800, 1000, 1250, 1500, 1750],
};

function getFareTableKey(pickup: string, dropoff: string): string | null {
  const p = pickup.toLowerCase();
  const d = dropoff.toLowerCase();

  const beach = identifyBeach(d) ?? identifyBeach(p);
  if (beach !== null) return null; 

  const pZone = getZone(p);
  const dZone = getZone(d);
  if (!pZone || !dZone || pZone === dZone) return null;

  if ((pZone === "west" && dZone === "central") || (pZone === "central" && dZone === "west")) {
    return "west-central";
  }
  if ((pZone === "west" && dZone === "east") || (pZone === "east" && dZone === "west")) {
    const sub = eastSubzone(pZone === "east" ? p : d);
    return `west-east-${sub}`;
  }
  if ((pZone === "west" && dZone === "south") || (pZone === "south" && dZone === "west")) {
    const sub = southSubzone(pZone === "south" ? p : d);
    return `west-south-${sub}`;
  }
  if (
    (pZone === "central" && (dZone === "east" || dZone === "south")) ||
    ((pZone === "east" || pZone === "south") && dZone === "central") ||
    (pZone === "east" && dZone === "south") ||
    (pZone === "south" && dZone === "east")
  ) {
    return "central-crossing";
  }
  return null;
}

function getFareFromTable(key: string, pax: number, tripType: string): number | null {
  const t = ROUTE_FARES[key];
  if (!t) return null;
  const off = tripType === "round" ? 5 : 0;
  if (pax <= 12) return t[off];
  if (pax <= 15) return t[off + 1];
  if (pax <= 18) return t[off + 2];
  if (pax <= 22) return t[off + 3];
  return t[off + 4]; 
}

function getRouteDisplayRange(key: string): FareRange | null {
  const t = ROUTE_FARES[key];
  if (!t) return null;
  return [t[0], t[4]]; 
}

function fmtFare(amount: number): string {
  return `TTD ${amount.toLocaleString("en-TT")}`;
}
function fmtRange([lo, hi]: FareRange): string {
  if (lo === hi) return `TTD ${lo.toLocaleString("en-TT")}`;
  return `TTD ${lo.toLocaleString("en-TT")} – ${hi.toLocaleString("en-TT")}`;
}
function getMinDatetime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
}
function vehicleForPax(pax: number): string {
  if (pax <= 12) return "12-Seater Maxi";
  if (pax <= 14) return "14-Seater Maxi";
  if (pax <= 15) return "15-Seater Maxi";
  if (pax <= 18) return "18-Seater Maxi";
  if (pax <= 22) return "22-Seater Maxi";
  return "25-Seater Maxi";
}
function paxLabel(pax: number): string {
  return `${pax} passenger${pax !== 1 ? "s" : ""} · 1 × ${vehicleForPax(pax)}`;
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

function ConfirmedScreen({
  job,
  onReset,
}: {
  job: { id: string; name: string; pickup: string; dropoff: string; fare: number; deposit: number; pickupDatetime: string; returnDatetime: string; tripType: string };
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
  const [pax, setPax]                         = useState(8);
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
    fare: number; deposit: number; pickupDatetime: string; returnDatetime: string; tripType: string;
  } | null>(null);

  const [stepErrors, setStepErrors] = useState(false);

  const queryClient = useQueryClient();
  const createJob   = useCreateJob();

  // ── LOCAL FARE CALCULATOR ──
  // Computes the correct fare from the built-in tables, accounting for
  // passenger count and trip type. No external API involved.
  const displayFare = useMemo<number | null>(() => {
    if (!pickup.trim() || !dropoff.trim()) return null;

    // 1. Beach routes (exact fare with pax + tripType)
    if (tripType) {
      const beachFare = getBeachExactFare(pickup, dropoff, pax, tripType);
      if (beachFare) return beachFare;
    }

    // 2. Exact fare table (with pax + tripType when available)
    const key = getFareTableKey(pickup, dropoff);
    if (key) {
      if (tripType) {
        const fare = getFareFromTable(key, pax, tripType);
        if (fare) return fare;
      } else {
        // Step 0: show the range start (12-seater one-way) as a preview
        const range = getRouteDisplayRange(key);
        if (range) return range[0];
      }
    }

    // 3. Zone-distance estimate fallback
    return estimateFareFromZones(pickup, dropoff);
  }, [pickup, dropoff, pax, tripType]);

  const deposit = displayFare
    ? Math.ceil(displayFare * 0.25)
    : null;

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
    
    // Safely handles both our API fallback and local logic
    const fareLabel = displayFare
  ? fmtFare(displayFare)
  : "Quote on request";
    const priceNote = `${fareLabel} (${tripLabel}, ${passengerDesc}) — Pickup: ${pickupDatetime}${returnNote}`;

    createJob.mutate(
      { data: { pickup, dropoff, name, phone, price: priceNote, passengers: passengerDesc } },
      {
        onSuccess: job => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
          setBookedJob({ id: job.id, name, pickup, dropoff, fare: displayFare ?? 0, deposit: deposit ?? 0, pickupDatetime, returnDatetime, tripType });
        },
      }
    );
  }

  function resetAll() {
    setStep(0);
    setPickup(""); setDropoff("");
    setTripType(null); setPax(8);
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
                        placeholder="e.g. San Fernando, Chaguanas, Las Cuevas..."
                        className={`w-full h-12 px-4 rounded-xl border-2 bg-white text-teal-900 placeholder:text-teal-400 focus:border-teal-500 focus:outline-none text-sm transition-colors ${stepErrors && !dropoff.trim() ? "border-red-400" : "border-teal-100"}`}
                        value={dropoff}
                        onChange={e => { setDropoff(e.target.value); setStepErrors(false); }}
                      />
                      {stepErrors && !dropoff.trim() && <p className="text-xs text-red-600 font-medium">Please enter a dropoff location.</p>}
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
                      <button type="button" onClick={() => setPax(p => Math.max(8, p - 1))}
                        className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xl flex items-center justify-center hover:bg-teal-100 transition-colors shrink-0">−</button>
                      <span className="flex-1 text-center text-teal-900 font-black text-lg tabular-nums">{pax}</span>
                      <button type="button" onClick={() => setPax(p => Math.min(24, p + 1))}
                        className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xl flex items-center justify-center hover:bg-teal-100 transition-colors shrink-0">+</button>
                    </div>
                    <p className="text-xs text-teal-600/80 font-medium px-1">1 × {vehicleForPax(pax)}</p>
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

                  {tripType && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                      <div className="flex justify-between items-center gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-teal-500 uppercase tracking-wider font-bold">Fare</p>
                          <p className="text-xs text-teal-600">{tripType === "round" ? "Round trip" : "One way"} · {paxLabel(pax)}</p>
                        </div>
                        {displayFare
                          ? <p className="text-xl font-black text-teal-900 shrink-0">{fmtFare(displayFare)}</p>
                          : <p className="text-sm font-semibold text-teal-600 shrink-0">WhatsApp us for a quote</p>}
                      </div>
                      {getBeachExactFare(pickup, dropoff, pax, tripType ?? "one-way") && (
                        <p className="text-xs text-teal-500 mt-2 border-t border-amber-200 pt-2">
                          Beach trip · exact quote confirmed by WhatsApp after booking.
                        </p>
                      )}
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

                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-teal-800">Final Fare</p>
                        <p className="text-xs text-teal-600">{tripType === "round" ? "Round trip" : "One way"} · {paxLabel(pax)}</p>
                      </div>
                      {displayFare
                        ? <p className="text-2xl font-black text-teal-900 shrink-0">{fmtFare(displayFare)}</p>
                        : <p className="text-sm font-semibold text-teal-500 shrink-0">Quote on request</p>}
                    </div>
                    <div className="bg-white/70 border border-amber-100 rounded-xl px-3 py-2.5 flex gap-3 items-start">
                      <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        {deposit
                          ? <>
                              <p className="text-sm font-bold text-teal-900">25% Deposit: TTD {deposit.toLocaleString("en-TT")}</p>
                              <p className="text-xs text-teal-700/80 mt-0.5">Balance of TTD {((displayFare ?? 0) - deposit).toLocaleString("en-TT")} paid to your driver on the day.</p>
                            </>
                          : <p className="text-sm text-teal-700">Our team will confirm your exact fare and deposit by WhatsApp after booking.</p>
                        }
                      </div>
                    </div>
                  </div>

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
                      ? <><CheckCircle2 className="w-5 h-5" /> Confirm Booking &mdash; TTD {deposit.toLocaleString("en-TT")} deposit</>
                      : <><CheckCircle2 className="w-5 h-5" /> Confirm Booking</>}
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

      <footer className="py-8 px-6 text-center border-t border-teal-100 bg-[#FFFBF4]">
        <div className="flex justify-center items-center gap-3 mb-3">
          <div className="rounded overflow-hidden bg-white" style={{ width: 36, height: 36 }}>
            <img src="/logo-raw.png" alt="Maxi Hub TT" style={{ width: 36, height: 36, objectFit: "cover" }} />
          </div>
          <p className="font-black text-teal-900 text-sm">Maxi Hub TT</p>
        </div>
        <p className="text-xs text-teal-600/60 mb-1">Comfort. Reliability. Every Ride.</p>
        <div className="flex justify-center gap-4 mb-2">
          <a href="/terms" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Passenger Terms</a>
          <a href="/driver/terms" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Driver Terms</a>
        </div>
        <p className="text-xs text-teal-600/40">© {new Date().getFullYear()} Maxi Hub TT. All rights reserved. Trinidad & Tobago.</p>
      </footer>

    </div>
  );
}
