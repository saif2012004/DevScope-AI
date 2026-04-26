import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";

type Plan = "FREE" | "PRO";

export function PlanBadge({ plan }: { plan: Plan }) {
  const isPro = plan === "PRO";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isPro
          ? "bg-gradient-to-r from-brand to-amber-500 text-white shadow-sm dark:from-brand dark:to-amber-600"
          : "bg-muted text-muted-foreground",
      )}
    >
      {isPro ? <Crown className="h-3 w-3 shrink-0" strokeWidth={2} /> : null}
      {isPro ? "Pro" : "Free"}
    </span>
  );
}
