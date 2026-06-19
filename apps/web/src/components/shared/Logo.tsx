import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md";

const sizeConfig: Record<
  LogoSize,
  { box: string; mark: string; text: string }
> = {
  sm: {
    box: "h-6 w-6 min-h-6 min-w-6",
    mark: "text-[10px]",
    text: "text-sm",
  },
  md: {
    box: "h-8 w-8 min-h-8 min-w-8",
    mark: "text-xs",
    text: "text-base",
  },
};

export function Logo({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  const cfg = sizeConfig[size];
  return (
    <Link
      href="/dashboard"
      className={cn("group flex items-center gap-2.5", className)}
    >
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-lg font-bold text-white",
          "bg-gradient-to-br from-[hsl(263_85%_70%)] via-[hsl(263_85%_60%)] to-[hsl(263_85%_45%)]",
          "shadow-[0_4px_18px_-4px_hsl(263_85%_60%/0.7)]",
          "ring-1 ring-white/10",
          "transition-shadow group-hover:shadow-[0_6px_24px_-4px_hsl(263_85%_60%/0.9)]",
          cfg.box,
          cfg.mark,
        )}
      >
        DS
      </div>
      <span className={cn("font-semibold leading-none tracking-tight", cfg.text)}>
        DevScope
        <span className="text-gradient-brand font-bold"> AI</span>
      </span>
    </Link>
  );
}
