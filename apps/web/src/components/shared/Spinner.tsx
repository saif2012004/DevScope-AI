import { cn } from "@/lib/utils";

const sizeClass = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

export function Spinner({
  size = "md",
  className,
}: {
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin rounded-full border-brand border-t-transparent",
        sizeClass[size],
        className,
      )}
    />
  );
}
