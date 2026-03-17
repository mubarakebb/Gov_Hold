import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Image as ImageIcon, CheckCircle2, Clock, AlertCircle, ThumbsUp, Users } from "lucide-react";
import { type Report, useConfirmReport, useUnconfirmReport } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { cn } from "@/lib/utils";

const statusConfig = {
  open: { label: "Open", icon: AlertCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  in_progress: { label: "In Progress", icon: Clock, className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  resolved: { label: "Resolved", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
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
};

function formatReporters(report: ReportWithMeta): string {
  const firstName = report.submittedBy?.firstName ?? null;
  const total = report.reportersCount ?? 1;
  if (!firstName) return `${total} reporter${total !== 1 ? "s" : ""}`;
  if (total === 1) return firstName;
  return `${firstName} and ${total - 1} other${total - 1 !== 1 ? "s" : ""}`;
}

export function ReportCard({ report, onClick }: { report: ReportWithMeta; onClick?: (r: ReportWithMeta) => void }) {
  const status = statusConfig[report.status as keyof typeof statusConfig] ?? statusConfig.open;
  const StatusIcon = status.icon;
  const { isAuthenticated, login } = useAuth();

  const [optimisticConfirmed, setOptimisticConfirmed] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const confirmMutation = useConfirmReport();
  const unconfirmMutation = useUnconfirmReport();

  const isConfirmed = optimisticConfirmed;
  const count = optimisticCount ?? (report.confirmationsCount ?? 0);
  const isHighlighted = report.isHighlighted;
  const reportersLabel = formatReporters(report);

  function handleConfirmClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isAuthenticated) { login(); return; }
    if (isConfirmed) {
      setOptimisticConfirmed(false);
      setOptimisticCount((c) => Math.max((c ?? count) - 1, 0));
      unconfirmMutation.mutate({ id: String(report.id) });
    } else {
      setOptimisticConfirmed(true);
      setOptimisticCount((c) => (c ?? count) + 1);
      confirmMutation.mutate({ id: String(report.id) });
    }
  }

  return (
    <div
      onClick={() => onClick?.(report)}
      className={cn(
        "group flex flex-col bg-white rounded-2xl border overflow-hidden transition-all duration-300",
        "hover:shadow-xl hover:shadow-primary/5",
        onClick && "cursor-pointer",
        isHighlighted
          ? "border-yellow-400 shadow-md shadow-yellow-200 ring-2 ring-yellow-300/50"
          : "border-border hover:border-primary/20"
      )}
    >
      {/* Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {report.imageUrl ? (
          <img src={report.imageUrl} alt={report.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/50">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium uppercase tracking-wider opacity-70">No image provided</span>
          </div>
        )}

        {isHighlighted && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-yellow-400 text-yellow-900 border border-yellow-500 shadow-sm">Featured</span>
          </div>
        )}

        <div className="absolute top-3 right-3">
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md bg-white/90 shadow-sm", status.className)}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border", categoryColors[report.category] || categoryColors.Other)}>
            {report.category}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
          </span>
        </div>

        <h3 className="font-display font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {report.title}
        </h3>

        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
          {report.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {/* Reporters label */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Users className="w-3.5 h-3.5 text-primary/50 flex-shrink-0" />
            <span className="truncate">{reportersLabel}</span>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirmClick}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ml-2",
              isConfirmed
                ? "bg-primary text-primary-foreground hover:bg-primary/80"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            <ThumbsUp className={cn("w-3.5 h-3.5", isConfirmed && "fill-current")} />
            {count}
          </button>
        </div>
      </div>
    </div>
  );
}
