"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  CreditCard,
  FileText,
  GitBranch,
  GitPullRequest,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/shared/Logo";
import { PlanBadge } from "@/components/shared/PlanBadge";
import { useBillingStatus } from "@/hooks/useBilling";
import { cn } from "@/lib/utils";

type CurrentUser = { plan: "FREE" | "PRO" };

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/repos", label: "Repositories", icon: GitBranch },
  { href: "/dashboard/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/dashboard/pr-review", label: "PR Review", icon: GitPullRequest },
  { href: "/dashboard/complexity", label: "Complexity", icon: BarChart2 },
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
        "fixed inset-y-0 left-0 z-50 flex h-screen w-sidebar shrink-0 flex-col border-r border-border/60 bg-background/80 backdrop-blur-xl transition-transform duration-200 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="relative p-4">
        <Logo size="md" />
      </div>

      <nav className="relative flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.()}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                mounted ? (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg border border-[hsl(263_85%_60%/0.35)] bg-[hsl(263_85%_60%/0.12)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : (
                  <span className="absolute inset-0 rounded-lg border border-[hsl(263_85%_60%/0.35)] bg-[hsl(263_85%_60%/0.12)]" />
                )
              ) : (
                <span className="absolute inset-0 rounded-lg bg-white/0 transition-colors group-hover:bg-white/[0.04]" />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-4 w-4 shrink-0 transition-colors",
                  active && "text-[hsl(263_85%_75%)]",
                )}
                aria-hidden
              />
              <span className="relative z-10 font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-border/60 p-4">
        {showUpgradePrompt ? (
          <Link
            href="/dashboard/billing"
            onClick={() => onNavigate?.()}
            className="group relative block overflow-hidden rounded-xl border border-[hsl(263_85%_60%/0.3)] bg-[hsl(263_85%_60%/0.1)] p-3 transition-colors hover:border-[hsl(263_85%_60%/0.5)] hover:bg-[hsl(263_85%_60%/0.18)]"
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[hsl(263_85%_60%/0.35)] blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-2">
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(263_85%_75%)]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
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
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
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
