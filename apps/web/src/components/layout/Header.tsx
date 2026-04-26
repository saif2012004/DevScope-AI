"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/context/PageTitleContext";

function NotificationBell() {
  return (
    <button
      type="button"
      className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
    </button>
  );
}

export function Header({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const { title } = usePageTitle();

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          aria-label="Open menu"
          onClick={() => onMenuClick?.()}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            DevScope AI / {title}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          className="hidden max-w-[200px] flex-1 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm sm:flex sm:min-w-[220px] sm:max-w-[280px]"
        >
          <span className="flex min-w-0 items-center gap-2 text-left text-muted-foreground">
            <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
            <span className="truncate">Search…</span>
          </span>
          <kbd className="pointer-events-none hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </button>
        <NotificationBell />
        <UserButton />
      </div>
    </header>
  );
}
