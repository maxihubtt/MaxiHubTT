import { useState } from "react";
import { Link } from "wouter";
import { Loader2, CheckCircle2, Car, User, Phone, Hash, ShieldCheck, ArrowLeft, AtSign } from "lucide-react";


export default function DriverSignup() {
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    phone: "",
    password: "",
    number_plate: "",
    dp_number: "",
    taxi_badge_number: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }));
      setError("");
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.values(form).some(v => !v.trim())) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/drivers/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess(true);
      } else if (res.status === 400) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; details?: string; hint?: string };
        const parts = [data.error, data.code && `code: ${data.code}`, data.details, data.hint].filter(Boolean);
        setError(parts.join(" | ") || "Please check your details and try again.");
      } else if (res.status === 503) {
        setError("Service temporarily unavailable. Please try again in a moment.");
      } else if (res.status >= 500) {
        setError("Server error. Please try again shortly or contact support.");
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Submission failed. Please try again.");
      }
    } catch {
      setError("Cannot reach the server — it may be starting up. Wait 30 seconds and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-black text-teal-900 mb-2">Application Submitted</h1>
          <p className="text-teal-700 text-sm leading-relaxed mb-4">
            Your driver application is under review. We'll contact you on <strong>{form.phone}</strong> once it has been approved.
          </p>
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs text-teal-500 font-semibold uppercase tracking-wider mb-1">Your login username</p>
            <p className="text-teal-600 text-sm">
              Once approved, you can log in with username{" "}
              <span className="font-mono font-bold text-teal-800">@{form.username}</span>{" "}
              and the password you chose.
            </p>
          </div>
          <Link href="/driver/login">
            <button className="w-full bg-teal-700 text-white font-bold py-3 rounded-xl hover:bg-teal-800 transition-colors">
              Back to Driver Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex flex-col">
      <div className="flex-1 flex items-start justify-center p-4 pt-10">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
              <Car className="w-4 h-4" />
              Maxi Hub TT
            </div>
            <h1 className="text-3xl font-black text-teal-900">Driver Application</h1>
            <p className="text-teal-600 text-sm mt-2">Fill in your details to apply. We'll review and contact you shortly.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">

            <div>
              <label className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              <input
                placeholder="e.g. Marcus Williams"
                value={form.full_name}
                onChange={set("full_name")}
                className="w-full border border-teal-200 bg-teal-50/30 rounded-xl px-4 py-3 text-teal-900 placeholder:text-teal-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <AtSign className="w-3.5 h-3.5" /> Username
              </label>
              <input
                placeholder="e.g. marcus123"
                value={form.username}
                onChange={e => { setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })); setError(""); }}
                className="w-full border border-teal-200 bg-teal-50/30 rounded-xl px-4 py-3 text-teal-900 placeholder:text-teal-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 lowercase"
                required
                autoComplete="username"
              />
              <p className="text-xs text-teal-400 mt-1">This is what you'll use to log in. Letters and numbers only.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </label>
              <input
                placeholder="e.g. 868-123-4567"
                value={form.phone}
                onChange={set("phone")}
                type="tel"
                className="w-full border border-teal-200 bg-teal-50/30 rounded-xl px-4 py-3 text-teal-900 placeholder:text-teal-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Password
              </label>
              <input
                type="password"
                placeholder="Choose a login password"
                value={form.password}
                onChange={set("password")}
                className="w-full border border-teal-200 bg-teal-50/30 rounded-xl px-4 py-3 text-teal-900 placeholder:text-teal-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="border-t border-teal-100 pt-4">
              <p className="text-xs font-semibold text-teal-500 uppercase tracking-wider mb-3">Vehicle Details</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Car className="w-3.5 h-3.5" /> Number Plate
                  </label>
                  <input
                    placeholder="e.g. PAB 1234"
                    value={form.number_plate}
                    onChange={set("number_plate")}
                    className="w-full border border-teal-200 bg-teal-50/30 rounded-xl px-4 py-3 text-teal-900 placeholder:text-teal-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Hash className="w-3.5 h-3.5" /> DP Number
                  </label>
                  <input
                    placeholder="e.g. DP12345"
                    value={form.dp_number}
                    onChange={set("dp_number")}
                    className="w-full border border-teal-200 bg-teal-50/30 rounded-xl px-4 py-3 text-teal-900 placeholder:text-teal-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Hash className="w-3.5 h-3.5" /> Taxi Badge Number
                  </label>
                  <input
                    placeholder="e.g. T987654"
                    value={form.taxi_badge_number}
                    onChange={set("taxi_badge_number")}
                    className="w-full border border-teal-200 bg-teal-50/30 rounded-xl px-4 py-3 text-teal-900 placeholder:text-teal-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-teal-700 text-white font-black py-3.5 rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm uppercase tracking-wider mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Application"}
            </button>

            <p className="text-center text-xs text-teal-500 pt-1">
              Already approved?{" "}
              <Link href="/driver/login" className="text-teal-700 font-semibold hover:underline">
                Log in here
              </Link>
            </p>
          </div>

          <Link href="/" className="flex items-center justify-center gap-1 text-teal-600 text-xs mt-6 hover:text-teal-800">
            <ArrowLeft className="w-3 h-3" /> Back to booking site
          </Link>
        </div>
      </div>
    </div>
  );
}
