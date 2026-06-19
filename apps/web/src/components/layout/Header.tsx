"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/context/PageTitleContext";

function NotificationBell() {
  return (
    <button
      type="button"
      className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-[hsl(263_85%_65%)] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(263_85%_65%)]" />
      </span>
    </button>
  );
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { title } = usePageTitle();

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
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
            DevScope AI <span className="opacity-50">/</span> {title}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          className="group hidden items-center justify-between gap-2 rounded-lg border border-border/60 bg-white/[0.02] px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-white/[0.05] hover:border-border sm:flex sm:min-w-[240px] sm:max-w-[300px]"
        >
          <span className="flex min-w-0 items-center gap-2 text-left text-muted-foreground">
            <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">Search…</span>
          </span>
          <kbd className="pointer-events-none hidden shrink-0 items-center gap-0.5 rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>
        <NotificationBell />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8 ring-1 ring-white/10",
            },
          }}
        />
      </div>
    </header>
  );
}
