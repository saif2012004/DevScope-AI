import Link from "next/link";

export function UsageBanner({ repoCount }: { repoCount: number }) {
  const used = Math.min(repoCount, 1);
  const pct = Math.min(100, (used / 1) * 100);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
        Free Plan: {used} of 1 repository used
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200/80 dark:bg-amber-900/60">
        <div
          className="h-full rounded-full bg-amber-600 transition-all dark:bg-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Link
        href="/dashboard/billing"
        className="mt-3 inline-block text-sm font-medium text-amber-900 underline-offset-4 hover:underline dark:text-amber-200"
      >
        Upgrade to Pro for unlimited repositories →
      </Link>
    </div>
  );
}
