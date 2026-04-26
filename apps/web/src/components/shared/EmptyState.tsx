import type { LucideIcon } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Icon
        className="mb-4 h-12 w-12 text-muted-foreground"
        strokeWidth={1.5}
        aria-hidden
      />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action ? (
        <Button type="button" className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
