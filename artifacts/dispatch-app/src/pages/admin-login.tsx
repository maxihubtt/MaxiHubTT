import { useState } from "react";
import { useLocation } from "wouter";
import { Zap, Lock, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

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
        navigate("/admin");
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Incorrect password");
      }
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-sm text-muted-foreground mt-1">Admin access only</p>
        </div>

        {/* Card */}
        <div className="bg-muted/20 border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Dispatcher Login
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
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
