import { Link } from "wouter";
import { MessageCircle, Users, Wind, Luggage, Wifi, ChevronRight, CheckCircle2 } from "lucide-react";

const WA = "https://wa.me/18684818039?text=Hi%20Maxi%20Hub%20TT%2C%20I%27d%20like%20to%20book%20a%20vehicle.";

const VEHICLES = [
  {
    name: "12-Seater Maxi",
    capacity: "Up to 12 passengers",
    paxRange: "1–12 pax",
    emoji: "🚐",
    color: "bg-teal-50 border-teal-200",
    badge: "bg-teal-100 text-teal-700",
    tag: "Most Popular",
    tagColor: "bg-amber-400 text-teal-900",
    desc: "Our workhorse. Perfect for standard group travel — airport runs, beach limes, family outings, and everyday routes across Trinidad & Tobago.",
    features: [
      "Air-conditioned cabin",
      "Comfortable bench seating",
      "Luggage storage in rear",
      "Professionally licensed driver",
    ],
    bestFor: ["Airport runs", "Beach limes", "Family trips", "Corporate transfers"],
  },
  {
    name: "14/15-Seater Maxi",
    capacity: "Up to 15 passengers",
    paxRange: "13–15 pax",
    emoji: "🚐",
    color: "bg-sky-50 border-sky-200",
    badge: "bg-sky-100 text-sky-700",
    tag: "Great for Groups",
    tagColor: "bg-sky-500 text-white",
    desc: "Slightly larger for medium groups that don't quite fit a 12-seater. Same comfort, a bit more room for passengers and luggage.",
    features: [
      "Air-conditioned cabin",
      "Extended seating capacity",
      "Luggage storage",
      "Professionally licensed driver",
    ],
    bestFor: ["Group events", "School outings", "Medium beach limes", "Team transfers"],
  },
  {
    name: "18-Seater Maxi",
    capacity: "Up to 18 passengers",
    paxRange: "16–18 pax",
    emoji: "🚌",
    color: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    tag: "Bigger Groups",
    tagColor: "bg-amber-500 text-white",
    desc: "Ideal for larger groups where a single standard maxi isn't enough. Keeps everyone together in one vehicle — no convoy needed.",
    features: [
      "Air-conditioned cabin",
      "Larger luggage capacity",
      "Overhead storage where available",
      "Professionally licensed driver",
    ],
    bestFor: ["Fetes & parties", "Corporate outings", "Large family trips", "Sports teams"],
  },
  {
    name: "22-Seater Bus",
    capacity: "Up to 22 passengers",
    paxRange: "19–22 pax",
    emoji: "🚌",
    color: "bg-purple-50 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    tag: "Event Ready",
    tagColor: "bg-purple-500 text-white",
    desc: "A full bus for big groups. Weddings, large corporate events, school trips — when you need to move a crowd, this is the vehicle.",
    features: [
      "Air-conditioned cabin",
      "High seating capacity",
      "Large luggage bay",
      "Professionally licensed driver",
    ],
    bestFor: ["Weddings", "School trips", "Large corporate events", "Festival transport"],
  },
  {
    name: "25-Seater Bus",
    capacity: "Up to 25 passengers",
    paxRange: "23–25 pax",
    emoji: "🚌",
    color: "bg-rose-50 border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    tag: "Maximum Capacity",
    tagColor: "bg-rose-500 text-white",
    desc: "Our largest vehicle. Built for maximum capacity — move an entire team, crew, or community group without splitting into multiple vehicles.",
    features: [
      "Air-conditioned cabin",
      "Maximum passenger capacity",
      "Large luggage compartments",
      "Professionally licensed driver",
    ],
    bestFor: ["Large weddings", "Carnival events", "Full team transport", "Community outings"],
  },
];

export default function Fleet() {
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
            <Link href="/pricing" className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">Pricing</Link>
            <span className="mx-1 text-amber-400">✦</span>
            <Link href="/fleet" className="bg-white/20 px-3 py-1.5 rounded-full border border-white/40 text-white">Fleet</Link>
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
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">Our Vehicles</p>
          <h1 className="text-4xl font-black text-white mb-4">The Right Vehicle<br /><span style={{ color: "#f59e0b" }}>for Every Group Size</span></h1>
          <p className="text-teal-200 text-sm max-w-xl mx-auto leading-relaxed">
            From a standard 12-seater for small groups to a 25-seater bus for large events — we have the vehicle to keep everyone together.
            The booking form picks the right size automatically based on your passenger count.
          </p>
        </div>
      </section>

      <section className="py-14 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VEHICLES.map(v => (
              <div key={v.name} className={`rounded-2xl border p-6 ${v.color}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{v.emoji}</span>
                    <div>
                      <h2 className="font-black text-teal-900 text-lg leading-tight">{v.name}</h2>
                      <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full ${v.badge}`}>
                        <Users className="w-3 h-3 inline mr-1" />{v.capacity}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap ${v.tagColor}`}>{v.tag}</span>
                </div>

                <p className="text-sm text-teal-800/80 leading-relaxed mb-4">{v.desc}</p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-2">Included</p>
                    <div className="space-y-1">
                      {v.features.map(f => (
                        <div key={f} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                          <span className="text-xs text-teal-800">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-2">Best For</p>
                    <div className="flex flex-wrap gap-1.5">
                      {v.bestFor.map(b => (
                        <span key={b} className="text-xs bg-white/70 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-full">{b}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link href="/"
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-black text-teal-900 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  Book this vehicle <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-6 md:px-12 bg-white border-t border-teal-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-teal-900 mb-2">Standard Features Across All Vehicles</h2>
            <p className="text-teal-700/70 text-sm">Every Maxi Hub TT vehicle comes with these as standard.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: <Wind className="w-6 h-6" />, label: "Air Conditioning", sub: "All vehicles" },
              { icon: <Luggage className="w-6 h-6" />, label: "Luggage Space", sub: "Rear storage" },
              { icon: <CheckCircle2 className="w-6 h-6" />, label: "Licensed Driver", sub: "Screened & vetted" },
              { icon: <Wifi className="w-6 h-6" />, label: "Real-Time Tracking", sub: "Track your booking" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center text-center p-4 rounded-2xl bg-teal-50 border border-teal-100">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-2">{icon}</div>
                <p className="font-black text-teal-900 text-sm">{label}</p>
                <p className="text-xs text-teal-600/70 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-6 md:px-12" style={{ background: "linear-gradient(135deg, #0f3d2e 0%, #0a2e21 100%)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black text-white mb-3">Need multiple vehicles?</h2>
          <p className="text-teal-300 text-sm mb-6">We can coordinate a fleet for weddings, Carnival, large corporate events, and more. WhatsApp us for a custom quote.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-white text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: "#25D366" }}>
              <MessageCircle className="w-4 h-4" />
              WhatsApp for Fleet Quote
            </a>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-sm border border-white/30 hover:bg-white/10 transition-colors">
              View Pricing →
            </Link>
          </div>
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
          <Link href="/pricing" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Pricing</Link>
          <Link href="/terms" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Passenger Terms</Link>
        </div>
        <p className="text-xs text-teal-600/40">© {new Date().getFullYear()} Maxi Hub TT. All rights reserved. Trinidad & Tobago.</p>
      </footer>
    </div>
  );
}
