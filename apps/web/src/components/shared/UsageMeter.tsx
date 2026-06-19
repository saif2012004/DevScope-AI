import { Progress } from "@/components/ui/progress";

export function UsageMeter({
  used,
  limit,
  label,
}: {
  used: number;
  limit: number | null;
  label: string;
}) {
  const title =
    label.length > 0
      ? label.charAt(0).toUpperCase() + label.slice(1)
      : label;

  if (limit === null) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm font-semibold text-emerald-400">Unlimited</p>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);
  const indicatorClass =
    pct >= 90
      ? "bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_12px_hsl(0_84%_60%/0.5)]"
      : pct >= 70
        ? "bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_12px_hsl(38_92%_60%/0.4)]"
        : "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_12px_hsl(142_71%_55%/0.4)]";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{used}</span>
          <span className="opacity-50"> / {limit}</span>
        </p>
      </div>
      <Progress value={pct} indicatorClassName={indicatorClass} className="h-2" />
      {pct >= 100 ? (
        <p className="text-xs font-medium text-red-400">
          Limit reached. Upgrade to Pro to continue.
        </p>
      ) : null}
    </div>
  );
}
