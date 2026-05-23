import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:          { label: "Pending",          className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  pending_deposit:  { label: "Awaiting Deposit", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  deposit_received: { label: "Deposit Received", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  driver_assigned:  { label: "Driver Assigned",  className: "bg-primary/10 text-primary border-primary/20" },
  driver_en_route:  { label: "En Route",         className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  claimed:          { label: "Claimed",           className: "bg-primary/10 text-primary border-primary/20" },
  completed:        { label: "Completed",         className: "bg-muted text-muted-foreground border-muted" },
  cancelled:        { label: "Cancelled",         className: "bg-red-500/10 text-red-500 border-red-500/20" },
  expired:          { label: "Expired",           className: "bg-gray-400/10 text-gray-400 border-gray-400/20" },
};

export function JobStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground border-muted" };
  return (
    <Badge variant="outline" className={`${cfg.className} font-mono uppercase tracking-wider`}>
      {cfg.label}
    </Badge>
  );
}

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent:   { label: "⚡ Urgent",   className: "bg-red-500/10 text-red-500 border-red-500/20" },
  same_day: { label: "🕐 Same Day", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  standard: { label: "Standard",   className: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
};

export function UrgencyBadge({ urgency }: { urgency?: string | null }) {
  if (!urgency || urgency === "standard") return null;
  const cfg = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.standard;
  return (
    <Badge variant="outline" className={`${cfg.className} font-mono uppercase tracking-wider`}>
      {cfg.label}
    </Badge>
  );
}
