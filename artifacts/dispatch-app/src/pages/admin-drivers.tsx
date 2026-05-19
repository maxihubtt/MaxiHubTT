import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Eye, EyeOff, Loader2, Trash2, UserPlus, Users } from "lucide-react";

interface DriverAccount {
  id: string;
  name: string;
  username: string;
  createdAt: string;
}

async function fetchDrivers(): Promise<DriverAccount[]> {
  const res = await fetch("/api/admin/drivers", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load drivers");
  return res.json() as Promise<DriverAccount[]>;
}

async function createDriver(data: { name: string; username: string; password: string }): Promise<DriverAccount> {
  const res = await fetch("/api/admin/drivers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const json = await res.json() as DriverAccount & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Failed to create driver");
  return json;
}

async function deleteDriver(id: string): Promise<void> {
  const res = await fetch(`/api/admin/drivers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? "Failed to delete driver");
  }
}

async function resetPassword(id: string, password: string): Promise<void> {
  const res = await fetch(`/api/admin/drivers/${id}/reset-password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? "Failed to reset password");
  }
}

function ResetPasswordModal({ driver, onClose }: { driver: DriverAccount; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => resetPassword(driver.id, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-drivers"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-foreground mb-1">Reset Password</h3>
        <p className="text-muted-foreground text-sm mb-4">{driver.name} ({driver.username})</p>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              className="w-full h-10 px-3 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted transition-colors">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!password || mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDrivers() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState("");
  const [resetTarget, setResetTarget] = useState<DriverAccount | null>(null);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: fetchDrivers,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      setName(""); setUsername(""); setPassword(""); setFormError("");
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-drivers"] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    createMutation.mutate({ name: name.trim(), username: username.trim().toLowerCase(), password: password.trim() });
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Driver Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage driver logins for the driver portal.</p>
        </div>

        {/* Create form */}
        <div className="bg-muted/20 border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add Driver</h2>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
              <input
                type="text"
                placeholder="Marcus Williams"
                value={name}
                onChange={e => { setName(e.target.value); setFormError(""); }}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Username</label>
              <input
                type="text"
                placeholder="marcus"
                value={username}
                onChange={e => { setUsername(e.target.value.toLowerCase()); setFormError(""); }}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary lowercase"
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Set a password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFormError(""); }}
                  className="w-full h-10 px-3 pr-9 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <button
                type="submit"
                disabled={createMutation.isPending || !name || !username || !password}
                className="h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Driver"}
              </button>
            </div>
            {formError && <p className="col-span-full text-red-500 text-xs">{formError}</p>}
          </form>
        </div>

        {/* Driver list */}
        <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {drivers.length} Driver{drivers.length !== 1 ? "s" : ""}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No drivers yet. Add one above.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {drivers.map(driver => (
                <div key={driver.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs font-black">{driver.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm truncate">{driver.name}</p>
                    <p className="text-muted-foreground text-xs font-mono">@{driver.username}</p>
                  </div>
                  <p className="text-muted-foreground text-xs hidden sm:block shrink-0">
                    Added {new Date(driver.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => setResetTarget(driver)}
                    className="text-xs text-muted-foreground hover:text-foreground border border-border px-2.5 py-1 rounded-lg transition-colors shrink-0"
                  >
                    Reset PW
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${driver.name}? They will no longer be able to log in.`)) {
                        deleteMutation.mutate(driver.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {resetTarget && <ResetPasswordModal driver={resetTarget} onClose={() => setResetTarget(null)} />}
    </Layout>
  );
}
