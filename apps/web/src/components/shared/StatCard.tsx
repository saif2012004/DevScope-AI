"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

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
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-colors hover:border-[hsl(263_85%_60%/0.35)]"
    >
      {/* Hover glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[hsl(263_85%_60%/0.15)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

      <Icon
        className="absolute right-5 top-5 h-5 w-5 text-muted-foreground transition-colors group-hover:text-[hsl(263_85%_75%)]"
        aria-hidden
      />
      <p className="relative text-3xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="relative mt-1 text-sm text-muted-foreground">{label}</p>
      {trend ? (
        <p
          className={cn(
            "relative mt-3 flex items-center gap-1 text-xs font-medium",
            trendPositive
              ? "text-emerald-400"
              : "text-red-400",
          )}
        >
          <span aria-hidden>{trendPositive ? "↑" : "↓"}</span>
          <span>
            {Math.abs(trend.value)}% {trend.label}
          </span>
        </p>
      ) : null}
    </motion.div>
  );
}
