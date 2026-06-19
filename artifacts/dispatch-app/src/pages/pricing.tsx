import { Fragment } from "react";
import { Link } from "wouter";
import { MessageCircle, Info, ChevronRight, Users, Anchor } from "lucide-react";
import { useState } from "react";

const WA = "https://wa.me/18684818039?text=Hi%20Maxi%20Hub%20TT%2C%20I%27d%20like%20to%20get%20a%20quote.";
const WA_ISLANDS = "https://wa.me/18684818039?text=Hi%20Maxi%20Hub%20TT%2C%20I%27d%20like%20to%20book%20a%20Down%20d%20Islands%20charter.";

const PAX_TIERS = [
  { label: "≤12 pax", hint: "12-seater maxi" },
  { label: "13–15 pax", hint: "14/15-seater maxi" },
  { label: "16–18 pax", hint: "18-seater maxi" },
  { label: "19–22 pax", hint: "22-seater maxi" },
  { label: "23–25 pax", hint: "25-seater maxi" },
];

type TabKey = "routes" | "beach" | "airport" | "islands";

const ROUTE_ROWS: { label: string; ow: number[]; rt: number[] }[] = [
  { label: "POS ↔ Chaguanas / Central",       ow: [480, 650, 800, 950, 1100],   rt: [800, 1000, 1250, 1500, 1750] },
  { label: "POS ↔ San Juan / Curepe",          ow: [350, 400, 500, 600, 700],    rt: [600, 700, 850, 1000, 1150] },
  { label: "POS ↔ Arima / Tunapuna",           ow: [480, 520, 650, 800, 950],    rt: [800, 900, 1100, 1300, 1500] },
  { label: "POS ↔ Sangre Grande / Valencia",   ow: [600, 650, 800, 950, 1100],   rt: [1000, 1100, 1350, 1600, 1850] },
  { label: "POS ↔ Toco / Matelot",             ow: [900, 1000, 1200, 1450, 1650], rt: [1500, 1650, 2000, 2400, 2750] },
  { label: "POS ↔ San Fernando / Marabella",   ow: [500, 600, 750, 900, 1050],   rt: [900, 1000, 1250, 1500, 1750] },
  { label: "POS ↔ Penal / Siparia / Debe",     ow: [650, 800, 1000, 1200, 1400], rt: [1100, 1300, 1600, 1900, 2200] },
  { label: "POS ↔ Point Fortin / La Brea",     ow: [900, 1000, 1200, 1450, 1650], rt: [1500, 1650, 2000, 2400, 2750] },
  { label: "POS ↔ Cedros / Icacos / Moruga",   ow: [1050, 1150, 1400, 1650, 1900], rt: [1700, 1800, 2200, 2600, 3000] },
  { label: "Central ↔ East / South",           ow: [500, 700, 850, 1000, 1200],  rt: [800, 1000, 1250, 1500, 1750] },
  { label: "Paramin (premium hill route)",     ow: [550, 650, 800, 950, 1100],   rt: [900, 1050, 1300, 1550, 1800] },
  { label: "Intra-West (POS / Diego Martin)",  ow: [180, 220, 280, 340, 400],    rt: [300, 360, 450, 540, 630] },
  { label: "Intra-Central (Chaguanas area)",   ow: [160, 195, 245, 295, 350],    rt: [260, 315, 395, 475, 555] },
  { label: "Intra-East (Arima / Tunapuna)",    ow: [200, 245, 305, 370, 435],    rt: [330, 400, 500, 600, 700] },
  { label: "Intra-South (SF area)",            ow: [180, 220, 275, 335, 395],    rt: [295, 360, 450, 540, 630] },
];

const BEACH_ROWS: { beach: string; west: [number, number, number, number]; east: [number, number, number, number]; central: [number, number, number, number]; south: [number, number, number, number] }[] = [
  { beach: "Maracas Bay",     west: [650, 800, 1000, 1200],   east: [750, 900, 1200, 1400],    central: [850, 1050, 1400, 1600],  south: [1200, 1500, 2000, 2400] },
  { beach: "Las Cuevas",      west: [750, 950, 1200, 1400],   east: [850, 1050, 1400, 1600],   central: [950, 1150, 1600, 1800],  south: [1300, 1600, 2200, 2600] },
  { beach: "Blanchisseuse",   west: [900, 1100, 1500, 1800],  east: [600, 800, 1000, 1200],    central: [1100, 1350, 1800, 2100], south: [1600, 2000, 2600, 3000] },
  { beach: "Manzanilla/Toco", west: [1200, 1500, 2000, 2400], east: [600, 800, 1000, 1200],    central: [900, 1100, 1500, 1800],  south: [900, 1100, 1500, 1800] },
  { beach: "Mayaro",          west: [750, 950, 1300, 1550],   east: [550, 700, 950, 1150],     central: [650, 800, 1100, 1350],   south: [350, 450, 620, 780] },
  { beach: "Vessigny",        west: [1100, 1400, 1800, 2100], east: [1300, 1600, 2200, 2600],  central: [800, 1000, 1400, 1600],  south: [500, 650, 900, 1100] },
  { beach: "Icacos",          west: [1600, 2000, 2600, 3000], east: [1500, 1900, 2600, 3000],  central: [1400, 1800, 2400, 2800], south: [800, 1000, 1400, 1600] },
];

const AIRPORT_ROWS: { route: string; ow: number; rt: number }[] = [
  { route: "Piarco ↔ Port of Spain / West", ow: 480,  rt: 800 },
  { route: "Piarco ↔ Chaguanas / Central",  ow: 350,  rt: 600 },
  { route: "Piarco ↔ Arima / Tunapuna",     ow: 200,  rt: 330 },
  { route: "Piarco ↔ San Fernando",         ow: 650,  rt: 1100 },
  { route: "Piarco ↔ Penal / Siparia",      ow: 800,  rt: 1300 },
  { route: "Piarco ↔ Point Fortin",         ow: 1000, rt: 1650 },
];

const ISLANDS_PACKAGES: {
  name: string;
  island: string;
  emoji: string;
  desc: string;
  includes: string[];
  note: string;
  fares: { tier: string; price: number }[];
}[] = [
  {
    name: "Gaspar Grande Day Trip",
    island: "Gaspar Grande",
    emoji: "⛵",
    desc: "The closest island — ideal for a relaxed half-day or full-day escape. Calm waters, a sea cave, and a quiet bay.",
    includes: ["Return maxi transfer to Carenage", "Return boat charter to Gaspar Grande", "Up to 8 hours on-island"],
    note: "Fares are per vehicle/boat package.",
    fares: [
      { tier: "≤8 pax",   price: 1800 },
      { tier: "9–12 pax", price: 2200 },
      { tier: "13–15 pax", price: 2800 },
    ],
  },
  {
    name: "Monos Island Full Day",
    island: "Monos",
    emoji: "🌊",
    desc: "The most popular islands charter — stunning villas, calm anchorages, and that iconic T&T island lime.",
    includes: ["Return maxi transfer to Carenage", "Return boat charter to Monos", "Up to 8 hours on-island", "Cooler storage on boat"],
    note: "Fares are per vehicle/boat package.",
    fares: [
      { tier: "≤8 pax",   price: 2200 },
      { tier: "9–12 pax", price: 2800 },
      { tier: "13–15 pax", price: 3400 },
    ],
  },
  {
    name: "Huevos & Chacachacare Cruise",
    island: "Huevos / Chacachacare",
    emoji: "🏝️",
    desc: "The full outer-islands experience — dramatic cliffs, crystal-clear waters, and ruins of the old leper colony.",
    includes: ["Return maxi transfer to Carenage", "Full-day boat charter with skipper", "Island hopping (Huevos + Chacachacare)", "Snorkelling stop"],
    note: "Minimum 6 passengers. Fares are per group.",
    fares: [
      { tier: "6–8 pax",   price: 3200 },
      { tier: "9–12 pax",  price: 3800 },
      { tier: "13–15 pax", price: 4500 },
    ],
  },
  {
    name: "Private Island Charter (Custom)",
    island: "Any island",
    emoji: "🗺️",
    desc: "Your crew, your itinerary. Choose your island(s), set your pace. Best for large groups, special occasions, and corporate events.",
    includes: ["Pickup from anywhere in T&T", "Dedicated maxi + skipper for the day", "Custom island itinerary", "Flexible timings"],
    note: "Pricing on request — WhatsApp us with your group size and date.",
    fares: [],
  },
];

function fmt(n: number) { return `$${n.toLocaleString("en-TT")}`; }

export default function Pricing() {
  const [tab, setTab] = useState<TabKey>("routes");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "routes",  label: "All Routes" },
    { key: "beach",   label: "Beach Trips" },
    { key: "airport", label: "Airport Runs" },
    { key: "islands", label: "Down d Islands" },
  ];

  return (
    <div className="min-h-screen bg-[#FFFBF4] text-teal-950" style={{ fontFamily: "'Outfit', sans-serif" }}>

      <header style={{ background: "linear-gradient(90deg, #0f3d2e 0%, #1a5c42 60%, #0f3d2e 100%)" }} className="text-amber-50 shadow-lg">
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ce1126 0%, #000 40%, #ce1126 100%)" }} />
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="rounded-lg overflow-hidden shadow-lg shrink-0 bg-white" style={{ width: 44, height: 44 }}>
              <img src="/logo-raw.png" alt="Maxi Hub TT logo" style={{ width: 44, height: 44, objectFit: "cover" }} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Maxi Hub TT</h1>
              <p className="text-xs text-amber-300 font-medium tracking-widest uppercase">Premium Shuttle Service</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-teal-100">
            <Link href="/about" className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">About</Link>
            <span className="mx-1 text-amber-400">✦</span>
            <Link href="/pricing" className="bg-white/20 px-3 py-1.5 rounded-full border border-white/40 text-white">Pricing</Link>
            <span className="mx-1 text-amber-400">✦</span>
            <Link href="/fleet" className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">Fleet</Link>
          </nav>
          <a href={WA} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95"
            style={{ background: "#25D366" }}>
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
        <div className="border-t border-white/10 py-2 text-center" style={{ background: "rgba(0,0,0,0.15)" }}>
          <p className="text-xs text-amber-200 font-medium tracking-widest uppercase">🌴 &nbsp; Safe. Smooth. On Time. That's How We Roll. &nbsp; 🌴</p>
        </div>
      </header>

      <section className="py-12 px-6 md:px-12" style={{ background: "linear-gradient(135deg, #0f3d2e 0%, #0a2e21 100%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">No Haggling</p>
          <h1 className="text-4xl font-black text-white mb-4">Transparent Fares</h1>
          <p className="text-teal-200 text-sm max-w-xl mx-auto leading-relaxed">
            All fares in TTD. Prices are per vehicle, not per person — you split the cost however you like.
            The booking form calculates your exact fare automatically based on your route and passenger count.
          </p>
        </div>
      </section>

      <div className="bg-white border-b border-teal-100 sticky top-0 z-10 overflow-x-auto">
        <div className="max-w-4xl mx-auto px-6 flex gap-0 min-w-max">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-4 text-sm font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${tab === t.key ? "border-amber-400 text-teal-900" : "border-transparent text-teal-600 hover:text-teal-900"}`}>
              {t.key === "islands" && <Anchor className="w-3.5 h-3.5" />}
              {t.label}
              {t.key === "islands" && <span className="text-xs bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded-full">NEW</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="py-10 px-4 md:px-12">
        <div className="max-w-5xl mx-auto">

          {tab === "routes" && (
            <div>
              <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-teal-700 leading-relaxed">
                  Fares are in TTD per vehicle. Larger passenger counts require bigger vehicles — the booking form picks the right one automatically.
                  Round-trip fares cover both legs on the same day.
                </p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-teal-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-teal-900 text-left" style={{ background: "linear-gradient(90deg, #0f3d2e, #1a5c42)" }}>
                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-white rounded-tl-2xl">Route</th>
                      <th className="px-3 py-3 text-xs font-black uppercase tracking-wide text-amber-300 text-center">Type</th>
                      {PAX_TIERS.map(p => (
                        <th key={p.label} className="px-3 py-3 text-xs font-black uppercase tracking-wide text-amber-300 text-right whitespace-nowrap">{p.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROUTE_ROWS.map((row, i) => (
                      <Fragment key={row.label}>
                        <tr className={`border-t border-teal-50 ${i % 2 === 0 ? "bg-white" : "bg-teal-50/30"}`}>
                          <td rowSpan={2} className="px-4 py-3 font-bold text-teal-900 align-middle border-r border-teal-100">{row.label}</td>
                          <td className="px-3 py-2 text-xs text-teal-500 font-semibold text-center whitespace-nowrap">One Way</td>
                          {row.ow.map((fare, fi) => (
                            <td key={fi} className="px-3 py-2 text-right font-mono font-bold text-teal-900 whitespace-nowrap">{fmt(fare)}</td>
                          ))}
                        </tr>
                        <tr className={`${i % 2 === 0 ? "bg-white" : "bg-teal-50/30"}`}>
                          <td className="px-3 py-2 text-xs text-amber-600 font-semibold text-center whitespace-nowrap border-b border-teal-50">Round Trip</td>
                          {row.rt.map((fare, fi) => (
                            <td key={fi} className="px-3 py-2 text-right font-mono font-bold text-amber-700 whitespace-nowrap border-b border-teal-50">{fmt(fare)}</td>
                          ))}
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-teal-500 text-center">
                Don't see your route? <a href={WA} target="_blank" rel="noopener noreferrer" className="text-teal-700 font-bold underline">WhatsApp us for a custom quote.</a>
              </p>
            </div>
          )}

          {tab === "beach" && (
            <div>
              <div className="mb-6 flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <p className="text-xs text-teal-700 leading-relaxed">
                  Beach fares are per vehicle and depend on your departure region. <strong>Lo fare</strong> = 12-seater maxi (≤12 pax).
                  <strong> Hi fare</strong> = 14/15-seater (13–15 pax). Larger vehicles cost more — the booking form calculates it automatically.
                  Round-trip fares cover same-day return.
                </p>
              </div>
              <div className="space-y-6">
                {BEACH_ROWS.map(row => (
                  <div key={row.beach} className="rounded-2xl border border-teal-100 bg-white overflow-hidden shadow-sm">
                    <div className="px-5 py-3 font-black text-teal-900 text-base border-b border-teal-50 flex items-center gap-2" style={{ background: "linear-gradient(90deg, #f0fdfa, #fff)" }}>
                      🏖️ {row.beach}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left bg-teal-50">
                            <th className="px-4 py-2 text-xs font-bold text-teal-600 uppercase tracking-wide">Your Region</th>
                            <th className="px-3 py-2 text-xs font-bold text-teal-600 uppercase tracking-wide text-right">OW Lo</th>
                            <th className="px-3 py-2 text-xs font-bold text-teal-600 uppercase tracking-wide text-right">OW Hi</th>
                            <th className="px-3 py-2 text-xs font-bold text-amber-600 uppercase tracking-wide text-right">RT Lo</th>
                            <th className="px-3 py-2 text-xs font-bold text-amber-600 uppercase tracking-wide text-right">RT Hi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(["west", "east", "central", "south"] as const).map((region, ri) => {
                            const r = row[region];
                            return (
                              <tr key={region} className={`border-t border-teal-50 ${ri % 2 === 0 ? "" : "bg-teal-50/20"}`}>
                                <td className="px-4 py-2.5 font-semibold text-teal-800 capitalize">{region}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-teal-900">{fmt(r[0])}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-teal-900">{fmt(r[1])}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700">{fmt(r[2])}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700">{fmt(r[3])}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "airport" && (
            <div>
              <div className="mb-6 flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                <p className="text-xs text-teal-700 leading-relaxed">
                  Airport fares below are for a 12-seater maxi (≤12 passengers). Larger vehicles cost proportionally more.
                  The exact fare is confirmed when you complete the booking form. We monitor your flight for delays.
                </p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-teal-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "linear-gradient(90deg, #0f3d2e, #1a5c42)" }}>
                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-white rounded-tl-2xl text-left">Route</th>
                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-amber-300 text-right">One Way</th>
                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-amber-300 text-right rounded-tr-2xl">Round Trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AIRPORT_ROWS.map((row, i) => (
                      <tr key={row.route} className={`border-t border-teal-50 ${i % 2 === 0 ? "bg-white" : "bg-teal-50/30"}`}>
                        <td className="px-4 py-3 font-bold text-teal-900">{row.route}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-teal-900">{fmt(row.ow)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{fmt(row.rt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-teal-500 text-center">
                Large groups or special requirements? <a href={WA} target="_blank" rel="noopener noreferrer" className="text-teal-700 font-bold underline">WhatsApp us.</a>
              </p>
            </div>
          )}

          {tab === "islands" && (
            <div>
              <div className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "linear-gradient(90deg, #0c3d2e15, #0f3d2e08)" , border: "1px solid #0f3d2e25" }}>
                <Anchor className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
                <p className="text-xs text-teal-700 leading-relaxed">
                  Every Down d Islands package includes <strong>door-to-door maxi transport</strong> from your pickup point to Carenage/Chaguaramas, plus a <strong>return boat charter</strong> to the island.
                  Fares are per group, not per person. A <strong>30% deposit</strong> secures your booking — balance is paid on the day.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {ISLANDS_PACKAGES.map(pkg => (
                  <div key={pkg.name} className="rounded-2xl border border-teal-100 bg-white overflow-hidden shadow-sm flex flex-col">
                    <div className="px-5 py-4 border-b border-teal-50" style={{ background: "linear-gradient(135deg, #0f3d2e, #1a5c42)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{pkg.emoji}</span>
                        <div>
                          <p className="font-black text-white text-base leading-tight">{pkg.name}</p>
                          <p className="text-xs text-amber-300 font-semibold">{pkg.island}</p>
                        </div>
                      </div>
                      <p className="text-xs text-teal-200 leading-relaxed mt-2">{pkg.desc}</p>
                    </div>

                    <div className="px-5 py-4 flex-1 flex flex-col gap-4">
                      <div>
                        <p className="text-xs font-black text-teal-700 uppercase tracking-widest mb-2">What's Included</p>
                        <ul className="space-y-1">
                          {pkg.includes.map(item => (
                            <li key={item} className="flex items-start gap-2 text-xs text-teal-800">
                              <span className="text-amber-500 mt-0.5">✓</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {pkg.fares.length > 0 ? (
                        <div>
                          <p className="text-xs font-black text-teal-700 uppercase tracking-widest mb-2">Fares (TTD per group)</p>
                          <div className="rounded-xl overflow-hidden border border-teal-100">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-teal-50">
                                  <th className="px-3 py-2 text-left text-xs font-bold text-teal-600">Group Size</th>
                                  <th className="px-3 py-2 text-right text-xs font-bold text-teal-600">Total Fare</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pkg.fares.map((f, fi) => (
                                  <tr key={f.tier} className={`border-t border-teal-50 ${fi % 2 === 0 ? "bg-white" : "bg-teal-50/20"}`}>
                                    <td className="px-3 py-2.5 font-semibold text-teal-800 text-xs">{f.tier}</td>
                                    <td className="px-3 py-2.5 text-right font-mono font-black text-teal-900">{fmt(f.price)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-teal-500 mt-1.5">{pkg.note}</p>
                        </div>
                      ) : (
                        <div className="mt-auto">
                          <p className="text-xs text-teal-500 mb-3">{pkg.note}</p>
                          <a href={WA_ISLANDS} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-black text-white transition-all hover:scale-105 active:scale-95"
                            style={{ background: "#25D366" }}>
                            <MessageCircle className="w-3.5 h-3.5" />
                            Get a Custom Quote
                          </a>
                        </div>
                      )}
                    </div>

                    {pkg.fares.length > 0 && (
                      <div className="px-5 pb-4">
                        <a href={WA_ISLANDS} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-black text-white transition-all hover:scale-105 active:scale-95"
                          style={{ background: "#25D366" }}>
                          <MessageCircle className="w-3.5 h-3.5" />
                          Book This Charter
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
                <p className="font-black text-teal-900 text-sm mb-1">Planning a big group or special occasion?</p>
                <p className="text-xs text-teal-700 leading-relaxed mb-3">
                  We can coordinate multiple maxis and multiple boats for large corporate groups, birthday celebrations, and weddings.
                  WhatsApp us with your group size, preferred island, and date.
                </p>
                <a href={WA_ISLANDS} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: "#25D366" }}>
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp for Group Booking
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

      <section className="py-10 px-6 md:px-12 bg-white border-t border-teal-100">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-lg font-black text-teal-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-teal-600" /> How the Deposit Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Book Online", desc: "Complete the booking form. You'll see your fare before confirming." },
              { step: "2", title: "Pay 25% Deposit", desc: "We'll contact you via WhatsApp to collect a 25% deposit to secure your driver." },
              { step: "3", title: "Balance on the Day", desc: "Pay the remaining balance directly to your driver when they arrive." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-teal-900 font-black text-sm shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>{step}</div>
                <div>
                  <p className="font-black text-teal-900 text-sm">{title}</p>
                  <p className="text-xs text-teal-700/70 leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-6 md:px-12" style={{ background: "linear-gradient(135deg, #0f3d2e 0%, #0a2e21 100%)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black text-white mb-3">Ready to book?</h2>
          <p className="text-teal-300 text-sm mb-6">Enter your route and get your exact fare instantly.</p>
          <Link href="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-teal-900 text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            Book Now <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 text-center border-t border-teal-100 bg-[#FFFBF4]">
        <div className="flex justify-center items-center gap-3 mb-3">
          <div className="rounded overflow-hidden bg-white" style={{ width: 36, height: 36 }}>
            <img src="/logo-raw.png" alt="Maxi Hub TT" style={{ width: 36, height: 36, objectFit: "cover" }} />
          </div>
          <p className="font-black text-teal-900 text-sm">Maxi Hub TT</p>
        </div>
        <p className="text-xs text-teal-600/60 mb-1">Comfort. Reliability. Every Ride.</p>
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Home</Link>
          <Link href="/about" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">About</Link>
          <Link href="/fleet" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Fleet</Link>
          <Link href="/terms" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Passenger Terms</Link>
        </div>
        <p className="text-xs text-teal-600/40">© {new Date().getFullYear()} Maxi Hub TT. All rights reserved. Trinidad & Tobago.</p>
      </footer>
    </div>
  );
}
