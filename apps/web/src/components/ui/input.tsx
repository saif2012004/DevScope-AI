import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm shadow-sm ring-offset-background backdrop-blur transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground/70",
        "hover:border-border",
        "focus-visible:outline-none focus-visible:border-[hsl(263_85%_60%/0.6)] focus-visible:ring-2 focus-visible:ring-[hsl(263_85%_60%/0.25)] focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
