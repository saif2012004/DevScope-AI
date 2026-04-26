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
      className={cn("flex items-center gap-2.5", className)}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-brand font-semibold text-white",
          cfg.box,
          cfg.mark,
        )}
      >
        DS
      </div>
      <span className={cn("font-semibold leading-none tracking-tight", cfg.text)}>
        DevScope
        <span className="font-bold text-brand"> AI</span>
      </span>
    </Link>
  );
}
