"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-4 animate-pulse rounded-full bg-[hsl(263_85%_60%/0.18)] blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[hsl(263_85%_60%/0.3)] bg-[hsl(263_85%_60%/0.10)] backdrop-blur">
          <Icon
            className="h-7 w-7 text-[hsl(263_85%_75%)]"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? (
        <Button type="button" className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </motion.div>
  );
}
