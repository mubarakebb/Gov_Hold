import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  X, MapPin, Calendar, Tag, ThumbsUp, Users, Image as ImageIcon,
  AlertCircle, Clock, CheckCircle2, ExternalLink, ShieldCheck
} from "lucide-react";
import {
  type Report,
  useConfirmReport,
  useUnconfirmReport,
  useResolveReport,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const statusConfig = {
  open: { label: "Open", icon: AlertCircle, className: "bg-red-100 text-red-700 border-red-200" },
  in_progress: { label: "In Progress", icon: Clock, className: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const categoryColors: Record<string, string> = {
  Road: "bg-stone-100 text-stone-700 border-stone-200",
  Water: "bg-blue-100 text-blue-700 border-blue-200",
  Electricity: "bg-yellow-100 text-yellow-700 border-yellow-200",
  School: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Hospital: "bg-rose-100 text-rose-700 border-rose-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

type ReportWithMeta = Report & {
  submittedBy?: { id?: string; firstName?: string | null; lastName?: string | null; state?: string | null; lga?: string | null } | null;
  reportersCount?: number;
  reporters?: Array<{ id: string; firstName?: string | null; lastName?: string | null }>;
};

function formatReporters(report: ReportWithMeta): string {
  const reporters = report.reporters ?? [];
  const firstName = report.submittedBy?.firstName ?? "Someone";
  const total = report.reportersCount ?? 1;

  if (total === 1) return `Reported by ${firstName}`;
  if (total === 2) {
    const second = reporters[0]?.firstName ?? "1 other";
    return `${firstName} and ${second}`;
  }
  return `${firstName} and ${total - 1} others`;
}

interface Props {
  report: ReportWithMeta | null;
  onClose: () => void;
}

export function ReportDetailModal({ report, onClose }: Props) {
  useEffect(() => {
    if (!report) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [report, onClose]);

  const { isAuthenticated, login, user } = useAuth();
  const queryClient = useQueryClient();
  const confirmMutation = useConfirmReport({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["listReports"] }); },
    },
  });
  const unconfirmMutation = useUnconfirmReport({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["listReports"] }); },
    },
  });
  const resolveMutation = useResolveReport({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["listReports"] }); },
    },
  });

  if (!report) return null;

  const status = statusConfig[report.status as keyof typeof statusConfig] ?? statusConfig.open;
  const StatusIcon = status.icon;
  const isVerifier = (user as { isVerifier?: boolean } | null)?.isVerifier;
  const isAdmin = user?.isAdmin;
  const canResolve = isVerifier || isAdmin;

  function handleConfirm() {
    if (!isAuthenticated) { login(); return; }
    confirmMutation.mutate({ id: report!.id });
  }

  function handleUnconfirm() {
    if (!isAuthenticated) { login(); return; }
    unconfirmMutation.mutate({ id: report!.id });
  }

  function handleResolve() {
    if (!isAuthenticated) { login(); return; }
    resolveMutation.mutate({ id: report!.id });
  }

  const mapUrl = report.latitude && report.longitude
    ? `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=16/${report.latitude}/${report.longitude}`
    : null;

  const locationDisplay = report.latitude && report.longitude
    ? `${(report.latitude as number).toFixed(5)}, ${(report.longitude as number).toFixed(5)}`
    : null;

  const locationArea = [
    report.submittedBy?.lga,
    report.submittedBy?.state
  ].filter(Boolean).join(", ");

  const resolvedCount = (report as { resolvedCount?: number }).resolvedCount ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative h-52 sm:h-64 bg-muted flex-shrink-0">
          {report.imageUrl ? (
            <img src={report.imageUrl} alt={report.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/50">
              <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
              <span className="text-xs opacity-60">No image provided</span>
            </div>
          )}

          <div className="absolute bottom-3 left-4 flex gap-2">
            <span className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-white/95 shadow-sm", status.className)}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </span>
            {report.isHighlighted && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 border border-yellow-500 shadow-sm">
                Featured
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="font-display font-bold text-xl leading-tight flex-1">{report.title}</h2>
              <span className={cn("flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border", categoryColors[report.category] ?? categoryColors.Other)}>
                {report.category}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground/80">{formatReporters(report)}</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm leading-relaxed text-foreground/80">{report.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-primary/70" />
                <span className="text-xs font-semibold text-muted-foreground">Location</span>
              </div>
              {locationArea && <p className="text-sm font-medium">{locationArea}</p>}
              {locationDisplay ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground font-mono">{locationDisplay}</p>
                  {mapUrl && (
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not specified</p>
              )}
            </div>

            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5 text-primary/70" />
                <span className="text-xs font-semibold text-muted-foreground">Reported</span>
              </div>
              <p className="text-sm font-medium">{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-3.5 h-3.5 text-primary/70" />
                <span className="text-xs font-semibold text-muted-foreground">Total Reporters</span>
              </div>
              <p className="text-sm font-medium">{report.reportersCount ?? 1} {(report.reportersCount ?? 1) === 1 ? "person" : "people"}</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-3.5 h-3.5 text-primary/70" />
                <span className="text-xs font-semibold text-muted-foreground">Category</span>
              </div>
              <p className="text-sm font-medium">{report.category}</p>
            </div>
          </div>

          {report.reporters && report.reporters.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Reporters</h3>
              <div className="flex flex-wrap gap-2">
                {report.submittedBy?.firstName && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                      {report.submittedBy.firstName[0].toUpperCase()}
                    </div>
                    {[report.submittedBy.firstName, report.submittedBy.lastName].filter(Boolean).join(" ")}
                  </span>
                )}
                {report.reporters.map((r) => (
                  <span key={r.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs font-semibold">
                    <div className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold">
                      {(r.firstName ?? "?")[0].toUpperCase()}
                    </div>
                    {[r.firstName, r.lastName].filter(Boolean).join(" ") || "User"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border px-5 py-4 bg-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4" />
                <span><strong className="text-foreground">{report.confirmationsCount}</strong> confirmation{report.confirmationsCount !== 1 ? "s" : ""}</span>
              </div>
              {resolvedCount > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                  <span><strong>{resolvedCount}</strong> verified resolved</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {canResolve && report.status !== "resolved" && (
                <button
                  onClick={handleResolve}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                  disabled={resolveMutation.isPending}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Issue Resolved
                </button>
              )}
              <button
                onClick={handleUnconfirm}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors font-medium"
                disabled={unconfirmMutation.isPending}
              >
                Remove Confirmation
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
                disabled={confirmMutation.isPending}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Confirm this issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
