import { Link } from "wouter";
import { MessageCircle, Info, ChevronRight, Users } from "lucide-react";
import { useState } from "react";

const WA = "https://wa.me/18684818039?text=Hi%20Maxi%20Hub%20TT%2C%20I%27d%20like%20to%20get%20a%20quote.";

const PAX_TIERS = [
  { label: "≤12 pax", hint: "12-seater maxi" },
  { label: "13–15 pax", hint: "14/15-seater maxi" },
  { label: "16–18 pax", hint: "18-seater maxi" },
  { label: "19–22 pax", hint: "22-seater maxi" },
  { label: "23–25 pax", hint: "25-seater maxi" },
];

type TabKey = "routes" | "beach" | "airport";

const ROUTE_ROWS: { label: string; from: string; to: string; ow: number[]; rt: number[] }[] = [
  { label: "POS ↔ Chaguanas / Central", from: "West", to: "Central", ow: [480, 650, 800, 950, 1100], rt: [800, 1000, 1250, 1500, 1750] },
  { label: "POS ↔ San Juan / Curepe", from: "West", to: "East (near)", ow: [350, 400, 500, 600, 700], rt: [600, 700, 850, 1000, 1150] },
  { label: "POS ↔ Arima / Tunapuna", from: "West", to: "East (mid)", ow: [480, 520, 650, 800, 950], rt: [800, 900, 1100, 1300, 1500] },
  { label: "POS ↔ Sangre Grande / Valencia", from: "West", to: "East (far)", ow: [600, 650, 800, 950, 1100], rt: [1000, 1100, 1350, 1600, 1850] },
  { label: "POS ↔ Toco / Matelot", from: "West", to: "East (Toco)", ow: [900, 1000, 1200, 1450, 1650], rt: [1500, 1650, 2000, 2400, 2750] },
  { label: "POS ↔ San Fernando / Marabella", from: "West", to: "South (close)", ow: [500, 600, 750, 900, 1050], rt: [900, 1000, 1250, 1500, 1750] },
  { label: "POS ↔ Penal / Siparia / Debe", from: "West", to: "South (mid)", ow: [650, 800, 1000, 1200, 1400], rt: [1100, 1300, 1600, 1900, 2200] },
  { label: "POS ↔ Point Fortin / La Brea", from: "West", to: "South (far)", ow: [900, 1000, 1200, 1450, 1650], rt: [1500, 1650, 2000, 2400, 2750] },
  { label: "POS ↔ Cedros / Icacos / Moruga", from: "West", to: "South (deep)", ow: [1050, 1150, 1400, 1650, 1900], rt: [1700, 1800, 2200, 2600, 3000] },
  { label: "Central ↔ East / South", from: "Central", to: "East/South", ow: [500, 700, 850, 1000, 1200], rt: [800, 1000, 1250, 1500, 1750] },
  { label: "Paramin (premium hill route)", from: "West", to: "Paramin", ow: [550, 650, 800, 950, 1100], rt: [900, 1050, 1300, 1550, 1800] },
  { label: "Intra-West (POS / Diego Martin area)", from: "West", to: "West", ow: [180, 220, 280, 340, 400], rt: [300, 360, 450, 540, 630] },
  { label: "Intra-Central (Chaguanas area)", from: "Central", to: "Central", ow: [160, 195, 245, 295, 350], rt: [260, 315, 395, 475, 555] },
  { label: "Intra-East (Arima / Tunapuna area)", from: "East", to: "East", ow: [200, 245, 305, 370, 435], rt: [330, 400, 500, 600, 700] },
  { label: "Intra-South (SF area)", from: "South", to: "South", ow: [180, 220, 275, 335, 395], rt: [295, 360, 450, 540, 630] },
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
  { route: "Piarco ↔ Port of Spain / West", ow: 480, rt: 800 },
  { route: "Piarco ↔ Chaguanas / Central",  ow: 350, rt: 600 },
  { route: "Piarco ↔ Arima / Tunapuna",     ow: 200, rt: 330 },
  { route: "Piarco ↔ San Fernando",         ow: 650, rt: 1100 },
  { route: "Piarco ↔ Penal / Siparia",      ow: 800, rt: 1300 },
  { route: "Piarco ↔ Point Fortin",         ow: 1000, rt: 1650 },
];

function fmt(n: number) { return `$${n.toLocaleString("en-TT")}`; }

export default function Pricing() {
  const [tab, setTab] = useState<TabKey>("routes");

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

      <div className="bg-white border-b border-teal-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 flex gap-0">
          {(["routes", "beach", "airport"] as TabKey[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-4 text-sm font-bold capitalize transition-colors border-b-2 ${tab === t ? "border-amber-400 text-teal-900" : "border-transparent text-teal-600 hover:text-teal-900"}`}>
              {t === "routes" ? "All Routes" : t === "beach" ? "Beach Trips" : "Airport Runs"}
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
                      <tr key={`${row.label}-ow`} className={`border-t border-teal-50 ${i % 2 === 0 ? "bg-white" : "bg-teal-50/30"}`}>
                        <td rowSpan={2} className="px-4 py-3 font-bold text-teal-900 align-middle border-r border-teal-100">{row.label}</td>
                        <td className="px-3 py-2 text-xs text-teal-500 font-semibold text-center whitespace-nowrap">One Way</td>
                        {row.ow.map((fare, fi) => (
                          <td key={fi} className="px-3 py-2 text-right font-mono font-bold text-teal-900 whitespace-nowrap">{fmt(fare)}</td>
                        ))}
                      </tr>
                    ))}
                    {ROUTE_ROWS.map((row, i) => (
                      <tr key={`${row.label}-rt`} className={`border-t border-teal-50/60 ${i % 2 === 0 ? "bg-white" : "bg-teal-50/30"}`}>
                        <td className="px-3 py-2 text-xs text-amber-600 font-semibold text-center whitespace-nowrap">Round Trip</td>
                        {row.rt.map((fare, fi) => (
                          <td key={fi} className="px-3 py-2 text-right font-mono font-bold text-amber-700 whitespace-nowrap">{fmt(fare)}</td>
                        ))}
                      </tr>
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
