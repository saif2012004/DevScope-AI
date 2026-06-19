import { CheckCircle, Loader2, XCircle } from "lucide-react";

import type { RepoStatus } from "@/types/repo";

export function StatusBadge({ status }: { status: RepoStatus }) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          Pending
        </span>
      );
    case "INDEXING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Indexing…
        </span>
      );
    case "INDEXED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Ready
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
          <XCircle className="h-3 w-3" aria-hidden />
          Failed
        </span>
      );
    default:
      return null;
  }
}
