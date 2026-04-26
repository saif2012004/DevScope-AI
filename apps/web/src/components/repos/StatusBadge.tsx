import { CheckCircle, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RepoStatus } from "@/types/repo";

export function StatusBadge({ status }: { status: RepoStatus }) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Pending
        </span>
      );
    case "INDEXING":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100",
          )}
        >
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Indexing...
        </span>
      );
    case "INDEXED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircle className="h-3 w-3" aria-hidden />
          Ready
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
          <XCircle className="h-3 w-3" aria-hidden />
          Failed
        </span>
      );
    default:
      return null;
  }
}
