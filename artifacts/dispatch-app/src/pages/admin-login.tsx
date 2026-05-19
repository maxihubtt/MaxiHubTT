import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, Lock, Eye, EyeOff, Wifi, WifiOff, Loader } from "lucide-react";

type ServerStatus = "checking" | "online" | "offline";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");

  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["admin-auth"] });
        navigate("/admin");
      } else if (res.status === 401) {
        setError("Incorrect password. Please try again.");
      } else if (res.status === 500) {
        setError("Server configuration error. Contact support.");
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Login failed. Please try again.");
      }
    } catch {
      setServerStatus("offline");
      setError("Cannot reach the server — it may be starting up. Wait 30 seconds and try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    checking: {
      icon: <Loader className="h-3 w-3 animate-spin" />,
      label: "Checking server…",
      className: "text-muted-foreground",
      dot: "bg-yellow-500 animate-pulse",
    },
    online: {
      icon: <Wifi className="h-3 w-3" />,
      label: "Server online",
      className: "text-green-500",
      dot: "bg-green-500",
    },
    offline: {
      icon: <WifiOff className="h-3 w-3" />,
      label: "Server waking up — may take ~30s",
      className: "text-yellow-500",
      dot: "bg-yellow-500 animate-pulse",
    },
  }[serverStatus];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary text-primary-foreground p-3 rounded-xl mb-4">
            <Zap className="h-7 w-7 fill-current" />
          </div>

          <h1 className="text-xl font-bold tracking-tight uppercase text-foreground">
            Maxi Hub Dispatch
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Admin access only
          </p>
        </div>

        {/* Card */}
        <div className="bg-muted/20 border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Dispatcher Login
              </h2>
            </div>

            {/* Server status indicator */}
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
            <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2.5 text-xs text-yellow-400 leading-relaxed">
              The server is waking up from sleep (Render free tier). Wait ~30 seconds then try logging in — or click the status above to recheck.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className={`w-full h-11 px-4 pr-10 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 transition-colors ${
                    error
                      ? "border-red-500/70 focus:ring-red-500/30"
                      : "border-border focus:ring-primary/30"
                  }`}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-medium">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Maxi Hub TT · Dispatch Portal
        </p>
      </div>
    </div>
  );
}
