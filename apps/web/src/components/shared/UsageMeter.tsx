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
        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
          Unlimited
        </p>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);
  const indicatorClass =
    pct > 90
      ? "bg-red-500"
      : pct >= 70
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <Progress value={pct} indicatorClassName={indicatorClass} className="h-2.5" />
      <p className="text-xs text-muted-foreground">
        {used} / {limit} {label}
      </p>
      {pct >= 100 ? (
        <p className="text-xs font-medium text-destructive">
          Limit reached. Upgrade to Pro to continue.
        </p>
      ) : null}
    </div>
  );
}
