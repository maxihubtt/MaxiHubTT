import { Link } from "wouter";
import { MessageCircle, Shield, Clock, Users, MapPin, Star, ChevronRight, Plane, Waves, Briefcase, ArrowLeft } from "lucide-react";

const WA = "https://wa.me/18684818039?text=Hi%20Maxi%20Hub%20TT%2C%20I%27d%20like%20to%20enquire%20about%20booking%20a%20ride.";

export default function About() {
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
            <Link href="/about" className="bg-white/20 px-3 py-1.5 rounded-full border border-white/40 text-white">About</Link>
            <span className="mx-1 text-amber-400">✦</span>
            <Link href="/pricing" className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">Pricing</Link>
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

      <section className="py-16 px-6 md:px-12" style={{ background: "linear-gradient(135deg, #0f3d2e 0%, #0a2e21 100%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">Our Story</p>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
            Trinidad's most reliable<br />
            <span style={{ color: "#f59e0b" }}>private hire service.</span>
          </h1>
          <p className="text-teal-200 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Maxi Hub TT was built for one reason — because getting around Trinidad & Tobago as a group shouldn't
            be a headache. No haggling, no guessing, no waiting. Just a clean maxi, a professional driver, and a fare you already know before you book.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-teal-900 text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              Book a Ride →
            </Link>
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-sm border border-white/30 hover:bg-white/10 transition-colors">
              <MessageCircle className="w-4 h-4" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
            <h2 className="text-3xl font-black text-teal-900 mb-2">Why Choose Maxi Hub TT?</h2>
            <p className="text-teal-700/70 text-sm">We built the experience around what passengers actually need.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: <Clock className="w-6 h-6" />, title: "Always On Time", desc: "We take punctuality seriously. Whether it's a 5am airport run or a beach trip, your driver knows when to show up.", color: "bg-sky-50 border-sky-100", iconBg: "bg-sky-100 text-sky-600" },
              { icon: <Shield className="w-6 h-6" />, title: "Fixed, Transparent Fares", desc: "No meter, no surprise charges, no haggling at the end. The fare you see when you book is the fare you pay.", color: "bg-amber-50 border-amber-100", iconBg: "bg-amber-100 text-amber-600" },
              { icon: <Users className="w-6 h-6" />, title: "Vetted Drivers", desc: "Every driver on our platform is screened, licensed, and accountable. You know who's picking you up before they arrive.", color: "bg-teal-50 border-teal-100", iconBg: "bg-teal-100 text-teal-600" },
              { icon: <Star className="w-6 h-6" />, title: "Rated After Every Ride", desc: "Passengers rate every trip. Drivers with poor ratings don't stay on our platform — your feedback matters.", color: "bg-green-50 border-green-100", iconBg: "bg-green-100 text-green-600" },
              { icon: <MapPin className="w-6 h-6" />, title: "Island-Wide Coverage", desc: "POS to Siparia, Arima to Maracas, Piarco Airport to anywhere — we cover all of Trinidad and Tobago.", color: "bg-purple-50 border-purple-100", iconBg: "bg-purple-100 text-purple-600" },
              { icon: <MessageCircle className="w-6 h-6" />, title: "WhatsApp Support", desc: "Questions? Changes? Our team is on WhatsApp. Real people, fast replies — no bots, no hold music.", color: "bg-green-50 border-green-100", iconBg: "bg-green-100 text-green-700" },
            ].map(({ icon, title, desc, color, iconBg }) => (
              <div key={title} className={`rounded-2xl border p-6 flex gap-4 items-start ${color}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
                <div>
                  <h3 className="font-black text-teal-900 text-base mb-1">{title}</h3>
                  <p className="text-sm leading-relaxed text-teal-800/70">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 md:px-12 bg-[#FFFBF4]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
            <h2 className="text-3xl font-black text-teal-900 mb-2">What We Specialise In</h2>
            <p className="text-teal-700/70 text-sm">From solo airport runs to full fleet events — we do it all.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { icon: <Plane className="w-6 h-6" />, title: "Airport Runs", desc: "Piarco pickups and drop-offs timed around your flight. We monitor delays so you're never left waiting.", iconBg: "bg-sky-100 text-sky-600", border: "border-sky-100" },
              { icon: <Waves className="w-6 h-6" />, title: "Beach Limes", desc: "Maracas, Las Cuevas, Mayaro, Manzanilla, Icacos — fixed beach fares, no haggling with strangers.", iconBg: "bg-teal-100 text-teal-600", border: "border-teal-100" },
              { icon: <Users className="w-6 h-6" />, title: "Group Events", desc: "School trips, family outings, fetes, and sports events. Everyone in one vehicle, no convoy confusion.", iconBg: "bg-amber-100 text-amber-600", border: "border-amber-100" },
              { icon: <Briefcase className="w-6 h-6" />, title: "Corporate Hire", desc: "Professional transfers for your team, clients, or executives. Presentable vehicles, reliable service.", iconBg: "bg-slate-100 text-slate-600", border: "border-slate-100" },
            ].map(({ icon, title, desc, iconBg, border }) => (
              <div key={title} className={`rounded-2xl border bg-white p-6 flex gap-4 items-start ${border}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
                <div>
                  <h3 className="font-black text-teal-900 text-base mb-1">{title}</h3>
                  <p className="text-sm leading-relaxed text-teal-800/70">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="h-0.5 w-16 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126)" }} />
            <h2 className="text-3xl font-black text-teal-900 mb-2">What Our Passengers Say</h2>
            <p className="text-teal-700/70 text-sm">Real reviews from real riders across Trinidad & Tobago.</p>
          </div>
          <div className="space-y-4">
            {[
              { name: "Kezia M.", area: "Diego Martin", stars: 5, text: "Took the whole family to Maracas for my birthday. Driver was on time, maxi was spotless, and the fare was exactly what it said online. Will definitely use again!" },
              { name: "Ravi P.", area: "San Fernando", stars: 5, text: "Used Maxi Hub TT for our company outing to Chaguanas. Booked the night before and everything was sorted by morning. Professional service all the way." },
              { name: "Anika R.", area: "Arima", stars: 5, text: "Best airport run I've ever had. Flight landed early and the driver was already waiting. No fuss, no extra charge. This is how it should be done." },
              { name: "Terrence C.", area: "Chaguanas", stars: 5, text: "Used the app to book a beach lime for 14 people. The price was fair and the booking was confirmed in minutes. Driver called us the night before to confirm." },
            ].map(({ name, area, stars, text }) => (
              <div key={name} className="rounded-2xl border border-teal-100 bg-[#FFFBF4] p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div>
                        <p className="font-black text-teal-900 text-sm">{name}</p>
                        <p className="text-xs text-teal-500">{area}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: stars }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-teal-800/80 leading-relaxed">"{text}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6 md:px-12" style={{ background: "linear-gradient(135deg, #0f3d2e 0%, #0a2e21 100%)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">Ready to ride?</p>
          <h2 className="text-3xl font-black text-white mb-4">Book your maxi in under 2 minutes.</h2>
          <p className="text-teal-300 text-sm mb-8 leading-relaxed">
            Enter your route, pick your date, and get an instant fare — no phone calls, no back-and-forth. Just book and we handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-teal-900 text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              Book Now <ChevronRight className="w-4 h-4" />
            </Link>
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
          <Link href="/pricing" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Pricing</Link>
          <Link href="/fleet" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Fleet</Link>
          <Link href="/terms" className="text-xs text-teal-600/50 hover:text-teal-700 underline underline-offset-2 transition-colors">Passenger Terms</Link>
        </div>
        <p className="text-xs text-teal-600/40">© {new Date().getFullYear()} Maxi Hub TT. All rights reserved. Trinidad & Tobago.</p>
      </footer>
    </div>
  );
}
