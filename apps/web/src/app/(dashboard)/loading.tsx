import { Spinner } from "@/components/shared/Spinner";

export default function DashboardRouteLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <Spinner size="lg" className="h-12 w-12 border-[3px]" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
