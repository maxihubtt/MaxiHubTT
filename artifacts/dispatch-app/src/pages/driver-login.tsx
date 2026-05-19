import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, Wifi, WifiOff, Loader } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type ServerStatus = "checking" | "online" | "offline";

export default function DriverLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const checkServer = useCallback(async () => {
    setServerStatus("checking");
    try {
      const res = await fetch("/api/healthz", { signal: AbortSignal.timeout(8000) });
      setServerStatus(res.ok ? "online" : "offline");
    } catch {
      setServerStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, [checkServer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/driver-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.ok) {
        await qc.invalidateQueries({ queryKey: ["driver-auth"] });
        navigate("/driver/jobs");
      } else if (res.status === 401) {
        setError("Invalid username or password. Please try again.");
      } else if (res.status >= 500) {
        setError("Server error. Please try again shortly.");
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Login failed");
      }
    } catch {
      setServerStatus("offline");
      setError("Cannot reach the server — it may be starting up. Wait 30 seconds and try again.");
    } finally {
      setLoading(false);
    }
  }

  const statusConfig = {
    checking: {
      icon: <Loader className="w-3 h-3 animate-spin" />,
      label: "Checking server…",
      className: "text-teal-500",
      dot: "bg-yellow-400 animate-pulse",
    },
    online: {
      icon: <Wifi className="w-3 h-3" />,
      label: "Server online",
      className: "text-green-400",
      dot: "bg-green-400",
    },
    offline: {
      icon: <WifiOff className="w-3 h-3" />,
      label: "Server waking up",
      className: "text-yellow-400",
      dot: "bg-yellow-400 animate-pulse",
    },
  }[serverStatus];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: "#0c3527", fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="h-1 w-full fixed top-0 left-0" style={{ background: "linear-gradient(90deg, #ce1126, #000, #ce1126, #f59e0b, #0f3d2e)" }} />

      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg mb-4"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          <span className="text-teal-900">M</span>
        </div>
        <h1 className="text-white font-black text-xl tracking-tight">Maxi Hub TT</h1>
        <p className="text-teal-400 text-sm mt-1">Driver Portal</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/8 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-base">Sign in to view jobs</h2>

          {/* Server status */}
          <button
            type="button"
            onClick={checkServer}
            title="Click to recheck server status"
            className={`flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70 ${statusConfig.className}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </button>
        </div>

        {serverStatus === "offline" && (
          <div className="mb-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2.5 text-xs text-yellow-300 leading-relaxed">
            The server is waking up from sleep. Wait ~30 seconds then try signing in, or tap the status above to recheck.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-teal-400 text-xs font-semibold uppercase tracking-wider">Username</label>
            <input
              type="text"
              placeholder="e.g. marcus"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(""); }}
              className="w-full h-12 px-4 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-teal-600 focus:outline-none focus:border-amber-400 text-sm lowercase"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-teal-400 text-xs font-semibold uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                className={`w-full h-12 px-4 pr-12 rounded-xl bg-white/10 border text-white placeholder:text-teal-600 focus:outline-none text-sm transition-colors ${
                  error ? "border-red-500/60 focus:border-red-400" : "border-white/15 focus:border-amber-400"
                }`}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500 hover:text-teal-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full h-12 rounded-xl font-black text-teal-900 text-sm uppercase tracking-wide disabled:opacity-50 transition-all active:scale-[0.98] mt-2"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Signing in…</span>
              : "Sign In"}
          </button>
        </form>
      </div>

      <p className="text-teal-700 text-xs mt-8">Maxi Hub TT · Driver Access</p>
    </div>
  );
}
