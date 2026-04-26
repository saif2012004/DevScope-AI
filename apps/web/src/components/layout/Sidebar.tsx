"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  FileText,
  GitBranch,
  Home,
  MessageSquare,
  Settings,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/shared/Logo";
import { PlanBadge } from "@/components/shared/PlanBadge";
import { useBillingStatus } from "@/hooks/useBilling";
import { cn } from "@/lib/utils";

type CurrentUser = {
  plan: "FREE" | "PRO";
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/repos", label: "Repositories", icon: GitBranch },
  { href: "/dashboard/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/dashboard/docs", label: "Documentation", icon: FileText },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
} = {}) {
  const pathname = usePathname() ?? "";
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: billing } = useBillingStatus();
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () =>
      queryClient.getQueryData<CurrentUser>(["currentUser"]) ?? null,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";

  const plan = billing?.plan ?? currentUser?.plan ?? "FREE";
  const showUpgradePrompt = plan === "FREE";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-sidebar shrink-0 flex-col border-r border-border bg-background transition-transform duration-200 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="p-4">
        <Logo size="md" />
      </div>
      <div className="mx-4 border-t border-border" />
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                active
                  ? "bg-brand-light font-medium text-brand"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 border-t border-border p-4">
        {showUpgradePrompt ? (
          <Link
            href="/dashboard/billing"
            onClick={() => onNavigate?.()}
            className="block rounded-lg border border-brand bg-brand-light p-3 transition-colors duration-150 hover:bg-brand-light/80"
          >
            <div className="flex items-start gap-2">
              <Zap
                className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  Upgrade to Pro
                </p>
                <p className="text-xs text-muted-foreground">
                  $12/month — unlock everything
                </p>
              </div>
            </div>
          </Link>
        ) : null}
        <div className="flex items-center gap-2">
          <PlanBadge plan={plan} />
        </div>
        <div className="flex items-center gap-3">
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
              aria-hidden
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {displayName}
          </span>
        </div>
      </div>
    </aside>
  );
}
