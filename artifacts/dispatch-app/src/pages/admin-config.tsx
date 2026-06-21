import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Save, RotateCcw, Bell, BellOff, Copy, Check, Send } from "lucide-react";

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

interface VapidStatus {
  configured: boolean;
  publicKey: string;
  privateKey?: string;
  instructions?: string;
}

function VapidSetup() {
  const [status, setStatus] = useState<VapidStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"pub" | "priv" | null>(null);

  async function loadVapid() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vapid", { credentials: "include" });
      if (res.ok) setStatus(await res.json() as VapidStatus);
    } catch {}
    setLoading(false);
  }

  function copyToClipboard(text: string, which: "pub" | "priv") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  }

  return (
    <Card className="p-6 space-y-4 bg-muted/20">
      <div className="flex items-center gap-3">
        {status?.configured ? (
          <Bell className="h-5 w-5 text-green-600" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-semibold">Push Notification Keys (VAPID)</p>
          <p className="text-xs text-muted-foreground">Required for driver push alerts</p>
        </div>
        <div className="ml-auto">
          {status?.configured ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">Configured</span>
          ) : (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">Not Set</span>
          )}
        </div>
      </div>

      {!status && (
        <button
          onClick={loadVapid}
          disabled={loading}
          className="h-9 px-4 rounded-lg border border-border bg-muted/40 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loading ? "Loading…" : "Check VAPID Status"}
        </button>
      )}

      {status?.configured && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          ✓ VAPID keys are set on your server. Push notifications are enabled.
          <p className="text-xs text-green-600 mt-1 font-mono break-all">Public key: {status.publicKey}</p>
        </div>
      )}

      {status && !status.configured && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            VAPID keys are not set. Copy the generated keys below and add them as environment variables on your <strong>Render</strong> service, then redeploy.
          </p>
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">VAPID_PUBLIC_KEY</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background border border-border rounded px-2 py-1.5 break-all">{status.publicKey}</code>
                <button
                  onClick={() => copyToClipboard(status.publicKey, "pub")}
                  className="shrink-0 p-1.5 rounded border border-border hover:bg-muted transition-colors"
                  title="Copy"
                >
                  {copied === "pub" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            {status.privateKey && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">VAPID_PRIVATE_KEY</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-background border border-border rounded px-2 py-1.5 break-all">{status.privateKey}</code>
                  <button
                    onClick={() => copyToClipboard(status.privateKey!, "priv")}
                    className="shrink-0 p-1.5 rounded border border-border hover:bg-muted transition-colors"
                    title="Copy"
                  >
                    {copied === "priv" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠ These keys are generated fresh each time you click "Check VAPID Status". Copy both before leaving — they cannot be retrieved again. Once set on Render, do not regenerate or existing subscriptions will break.
          </p>
          <button
            onClick={loadVapid}
            disabled={loading}
            className="h-8 px-3 rounded border border-border bg-muted/40 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Regenerate Keys
          </button>
        </div>
      )}
    </Card>
  );
}

type TestState = "idle" | "sending" | "ok" | "fail";

function TelegramTest() {
  const [state, setState] = useState<TestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function sendTest() {
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/telegram/test", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as { success: boolean; message: string };
      setMessage(data.message);
      setState(data.success ? "ok" : "fail");
    } catch {
      setMessage("Network error — could not reach the server.");
      setState("fail");
    }
  }

  return (
    <Card className="p-6 space-y-4 bg-muted/20">
      <div className="flex items-center gap-3">
        <Send className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">Telegram Notifications</p>
          <p className="text-xs text-muted-foreground">Send a test message to verify your Telegram group is connected.</p>
        </div>
      </div>

      <button
        onClick={sendTest}
        disabled={state === "sending"}
        className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        <Send className="h-3.5 w-3.5" />
        {state === "sending" ? "Sending…" : "Send Test Message"}
      </button>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${state === "ok" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {state === "ok" ? "✓ " : "✗ "}{message}
        </div>
      )}
    </Card>
  );
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

        <div className="flex items-center gap-3 pt-2">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight">Push Notifications</h2>
            <p className="text-sm text-muted-foreground">VAPID key setup for driver push alerts.</p>
          </div>
        </div>

        <VapidSetup />

        <div className="flex items-center gap-3 pt-2">
          <Send className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight">Telegram</h2>
            <p className="text-sm text-muted-foreground">Test that job alerts reach your Telegram group.</p>
          </div>
        </div>

        <TelegramTest />
      </div>
    </Layout>
  );
}
