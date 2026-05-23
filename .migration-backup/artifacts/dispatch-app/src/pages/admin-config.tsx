import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Save, RotateCcw } from "lucide-react";

interface ConfigData {
  min_booking_hours: string;
  same_day_min_hours: string;
  deposit_pct: string;
  rush_fee: string;
  deposit_expiry_mins: string;
  urgent_enabled: string;
}

const FIELD_META: Record<keyof ConfigData, { label: string; description: string; type: "number" | "toggle" }> = {
  min_booking_hours:   { label: "Standard Booking Min Hours",  description: "Minimum hours before pickup for a standard booking (e.g. 6).", type: "number" },
  same_day_min_hours:  { label: "Same-Day Threshold (Hours)",  description: "Bookings under this many hours are classified as urgent (e.g. 2).", type: "number" },
  deposit_pct:         { label: "Deposit Percentage (%)",       description: "Percentage of the fare required as a deposit (e.g. 25).", type: "number" },
  rush_fee:            { label: "Rush Fee (TTD)",               description: "Additional fee added to urgent bookings, in TTD (e.g. 150).", type: "number" },
  deposit_expiry_mins: { label: "Deposit Expiry (Minutes)",     description: "How long a pending-deposit booking stays open before it auto-expires (e.g. 45).", type: "number" },
  urgent_enabled:      { label: "Urgent Bookings Enabled",      description: "Allow bookings under the same-day threshold (requires full payment + rush fee).", type: "toggle" },
};

async function fetchConfig(): Promise<ConfigData> {
  const res = await fetch("/api/admin/config", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load config");
  return res.json() as Promise<ConfigData>;
}

async function saveConfig(data: ConfigData): Promise<ConfigData> {
  const res = await fetch("/api/admin/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save config");
  return res.json() as Promise<ConfigData>;
}

export default function AdminConfig() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [draft, setDraft] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchConfig()
      .then(data => { setConfig(data); setDraft(data); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(key: keyof ConfigData, value: string) {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  function handleReset() {
    if (config) setDraft({ ...config });
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await saveConfig(draft);
      setConfig(updated);
      setDraft(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const isDirty = draft && config && JSON.stringify(draft) !== JSON.stringify(config);

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">Booking Configuration</h1>
            <p className="text-sm text-muted-foreground">Configure urgency tiers, deposit rules, and expiry settings.</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Card className="p-6 space-y-6 bg-muted/20">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : draft ? (
            (Object.keys(FIELD_META) as (keyof ConfigData)[]).map(key => {
              const meta = FIELD_META[key];
              const value = draft[key];

              return (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">{meta.label}</label>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>

                  {meta.type === "toggle" ? (
                    <button
                      type="button"
                      onClick={() => handleChange(key, value === "true" ? "false" : "true")}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all text-sm font-semibold ${
                        value === "true"
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/40 border-border text-muted-foreground"
                      }`}
                    >
                      <span className={`w-8 h-4 rounded-full relative transition-all ${value === "true" ? "bg-primary" : "bg-muted-foreground/30"}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow ${value === "true" ? "left-4" : "left-0.5"}`} />
                      </span>
                      {value === "true" ? "Enabled" : "Disabled"}
                    </button>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={e => handleChange(key, e.target.value)}
                      className="h-10 w-40 px-3 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>
              );
            })
          ) : null}
        </Card>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>

          {isDirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-muted/40 text-sm font-medium hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
