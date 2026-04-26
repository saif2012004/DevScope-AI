import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
}) {
  const trendPositive = trend !== undefined && trend.value >= 0;
  return (
    <Card>
      <CardContent className="relative p-6 pt-6">
        <Icon
          className="absolute right-4 top-4 h-5 w-5 text-muted-foreground"
          aria-hidden
        />
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        {trend ? (
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-sm font-medium",
              trendPositive ? "text-green-600" : "text-red-600",
            )}
          >
            <span aria-hidden>{trendPositive ? "↑" : "↓"}</span>
            <span>
              {Math.abs(trend.value)}% {trend.label}
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
