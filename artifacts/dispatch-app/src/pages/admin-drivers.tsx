import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  Eye, EyeOff, Loader2, Trash2, UserPlus, Users,
  CheckCircle2, XCircle, Clock, Car, Phone, Hash, ShieldAlert,
} from "lucide-react";


// ── Types ────────────────────────────────────────────────────────────────────
interface DriverAccount {
  id: string;
  name: string;
  username: string;
  availability: string;
  createdAt: string;
}

interface PendingSignup {
  id: string | number;
  full_name: string;
  username: string;
  phone: string;
  number_plate: string;
  dp_number: string;
  taxi_badge_number: string;
  status: string;
  created_at: string;
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function fetchDrivers(): Promise<DriverAccount[]> {
  const res = await fetch("/api/admin/drivers", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load drivers");
  return res.json() as Promise<DriverAccount[]>;
}

async function fetchPending(): Promise<PendingSignup[]> {
  const res = await fetch(`/api/admin/driver-signups`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load pending signups");
  return res.json() as Promise<PendingSignup[]>;
}

async function approveSignup(id: string | number): Promise<{ username: string }> {
  const res = await fetch(`/api/admin/driver-signups/${id}/approve`, {
    method: "POST",
    credentials: "include",
  });
  const json = await res.json() as { username?: string; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Failed to approve");
  return { username: json.username ?? "" };
}

async function rejectSignup(id: string | number): Promise<void> {
  const res = await fetch(`/api/admin/driver-signups/${id}/reject`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? "Failed to reject");
  }
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
  const res = await fetch(`/api/admin/drivers/${id}`, { method: "DELETE", credentials: "include" });
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

// ── Reset Password Modal ─────────────────────────────────────────────────────
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-teal-900 mb-1">Reset Password</h3>
        <p className="text-teal-600 text-sm mb-4">{driver.name} · @{driver.username}</p>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              className="w-full h-10 px-3 pr-10 rounded-lg border border-teal-200 bg-teal-50/30 text-teal-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-700">
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-teal-200 text-teal-600 text-sm hover:bg-teal-50 transition-colors">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!password || mutation.isPending}
              className="flex-1 h-9 rounded-lg bg-teal-700 text-white text-sm font-semibold disabled:opacity-50 hover:bg-teal-800 transition-colors"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function AdminDrivers() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState("");
  const [resetTarget, setResetTarget] = useState<DriverAccount | null>(null);
  const [approvedMsg, setApprovedMsg] = useState("");

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: fetchDrivers,
    retry: false,
  });

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-signups"],
    queryFn: fetchPending,
    retry: false,
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      setName(""); setUsername(""); setPassword(""); setFormError("");
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const [approveError, setApproveError] = useState("");

  const approveMutation = useMutation({
    mutationFn: approveSignup,
    onSuccess: (data) => {
      setApprovedMsg(`Driver approved! Their login username is: @${data.username}`);
      setApproveError("");
      qc.invalidateQueries({ queryKey: ["pending-signups"] });
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
      setTimeout(() => setApprovedMsg(""), 8000);
    },
    onError: (e: Error) => {
      setApproveError(e.message);
      setTimeout(() => setApproveError(""), 8000);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectSignup,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-signups"] }),
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
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-teal-900">Driver Management</h1>
          <p className="text-teal-600 text-sm mt-1">Review applications and manage driver logins.</p>
        </div>

        {/* Approved message */}
        {approvedMsg && (
          <div className="bg-teal-50 border border-teal-300 rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <p className="text-teal-800 text-sm font-medium">{approvedMsg}</p>
          </div>
        )}

        {/* Approve error */}
        {approveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-red-700 text-sm font-medium">{approveError}</p>
          </div>
        )}

        {/* Pending Applications */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-100 bg-amber-50">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider">
              Pending Applications
            </h2>
            {pending.length > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </div>

          {pendingLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 text-teal-400 text-sm">
              No pending applications.
            </div>
          ) : (
            <div className="divide-y divide-amber-50">
              {pending.map(s => (
                <div key={String(s.id)} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-amber-700 text-sm font-black">{s.full_name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-teal-900 font-bold text-sm">{s.full_name}</p>
                        {s.username && <span className="font-mono text-xs text-teal-500 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">@{s.username}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-teal-600">
                          <Phone className="w-3 h-3" /> {s.phone}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-teal-600">
                          <Car className="w-3 h-3" /> {s.number_plate}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-teal-500">
                          <Hash className="w-3 h-3" /> DP: {s.dp_number}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-teal-500">
                          <ShieldAlert className="w-3 h-3" /> Badge: {s.taxi_badge_number}
                        </span>
                      </div>
                      <p className="text-xs text-teal-400 mt-1">
                        Applied {new Date(s.created_at).toLocaleDateString("en-TT", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 mt-0.5">
                      <button
                        onClick={() => approveMutation.mutate(s.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1 bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50"
                      >
                        {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Reject application from ${s.full_name}?`)) {
                            rejectMutation.mutate(s.id);
                          }
                        }}
                        disabled={rejectMutation.isPending}
                        className="flex items-center gap-1 border border-red-200 text-red-500 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Drivers */}
        <div className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-teal-100">
            <Users className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wider">
              Active Drivers
            </h2>
            <span className="ml-auto text-xs text-teal-400 font-medium">{drivers.length} total</span>
          </div>

          {driversLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8 text-teal-400 text-sm">
              No active drivers yet.
            </div>
          ) : (
            <div className="divide-y divide-teal-50">
              {drivers.map(driver => (
                <div key={driver.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <span className="text-teal-700 text-xs font-black">{driver.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-teal-900 font-semibold text-sm truncate">{driver.name}</p>
                    <p className="text-teal-500 text-xs font-mono">@{driver.username}</p>
                  </div>
                  <p className="text-teal-400 text-xs hidden sm:block shrink-0">
                    {new Date(driver.createdAt).toLocaleDateString("en-TT", { day: "numeric", month: "short" })}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    driver.availability === "available"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {driver.availability === "available" ? "● Online" : "○ Offline"}
                  </span>
                  <button
                    onClick={() => setResetTarget(driver)}
                    className="text-xs text-teal-500 hover:text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                  >
                    Reset PW
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${driver.name}?`)) deleteMutation.mutate(driver.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-teal-300 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Driver manually */}
        <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wider">Add Driver Manually</h2>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-teal-500 mb-1 block">Full Name</label>
              <input
                type="text"
                placeholder="Marcus Williams"
                value={name}
                onChange={e => { setName(e.target.value); setFormError(""); }}
                className="w-full h-10 px-3 rounded-lg border border-teal-200 bg-teal-50/30 text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-teal-500 mb-1 block">Username</label>
              <input
                type="text"
                placeholder="marcus"
                value={username}
                onChange={e => { setUsername(e.target.value.toLowerCase()); setFormError(""); }}
                className="w-full h-10 px-3 rounded-lg border border-teal-200 bg-teal-50/30 text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 lowercase"
                required
              />
            </div>
            <div>
              <label className="text-xs text-teal-500 mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Set a password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFormError(""); }}
                  className="w-full h-10 px-3 pr-9 rounded-lg border border-teal-200 bg-teal-50/30 text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-700">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <button
                type="submit"
                disabled={createMutation.isPending || !name || !username || !password}
                className="h-10 rounded-lg bg-teal-700 text-white text-sm font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-teal-800 transition-colors"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add"}
              </button>
            </div>
            {formError && <p className="col-span-full text-red-500 text-xs">{formError}</p>}
          </form>
        </div>

      </div>

      {resetTarget && <ResetPasswordModal driver={resetTarget} onClose={() => setResetTarget(null)} />}
    </Layout>
  );
}
