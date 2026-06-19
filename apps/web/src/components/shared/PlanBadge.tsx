import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";

type Plan = "FREE" | "PRO";

export function PlanBadge({ plan }: { plan: Plan }) {
  const isPro = plan === "PRO";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        isPro
          ? "border-amber-400/40 bg-gradient-to-r from-[hsl(263_85%_60%)] via-[hsl(290_80%_60%)] to-amber-500 text-white shadow-[0_4px_18px_-4px_hsl(290_80%_60%/0.6)]"
          : "border-border/60 bg-white/[0.04] text-muted-foreground",
      )}
    >
      {isPro ? <Crown className="h-3 w-3 shrink-0" strokeWidth={2.2} /> : null}
      {isPro ? "Pro" : "Free"}
    </span>
  );
}
