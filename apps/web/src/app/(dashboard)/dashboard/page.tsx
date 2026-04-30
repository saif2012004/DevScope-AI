"use client";

import { useUser } from "@clerk/nextjs";
import {
  BarChart2,
  BookOpen,
  Clock,
  Crown,
  FileCode,
  FileText,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { UsageMeter } from "@/components/shared/UsageMeter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSetPageTitle } from "@/context/PageTitleContext";
import { useUsage } from "@/hooks/useUsage";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { cn } from "@/lib/utils";

// ── Activity feed ─────────────────────────────────────────────────────────────

type ActivityItem = {
  id: string;
  action: string;
  repoId: string | null;
  repoOwner: string | null;
  repoName: string | null;
  tokensUsed: number;
  createdAt: string;
};

const ACTION_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  chat_message: { label: "AI Chat", icon: MessageSquare, color: "text-purple-500" },
  doc_generate: { label: "Doc Generated", icon: FileText, color: "text-blue-500" },
  pr_review: { label: "PR Reviewed", icon: GitPullRequest, color: "text-green-500" },
  complexity_score: { label: "Complexity Scored", icon: BarChart2, color: "text-orange-500" },
};

function ActivityFeed() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await api.get<ActivityItem[]>("/api/auth/activity");
      return res.data;
    },
    staleTime: 60_000,
  });

  const shown = items.slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (shown.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No activity yet"
        description="Your recent actions will appear here"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {shown.map((item) => {
        const meta = ACTION_META[item.action] ?? {
          label: item.action,
          icon: Zap,
          color: "text-muted-foreground",
        };
        const Icon = meta.icon;
        return (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <Icon className={cn("h-4 w-4 shrink-0", meta.color)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{meta.label}</p>
              {item.repoOwner && item.repoName ? (
                <p className="text-xs text-muted-foreground">
                  {item.repoOwner}/{item.repoName}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(item.createdAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Greeting ──────────────────────────────────────────────────────────────────

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Main dashboard ────────────────────────────────────────────────────────────

function DashboardHome() {
  useSetPageTitle("Dashboard");
  const { user } = useUser();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  const firstName = user?.firstName || "there";
  const isPro = usage?.plan === "PRO";

  useEffect(() => {
    if (searchParams.get("upgraded") !== "true") return;
    startTransition(() => setShowToast(true));
    router.replace("/dashboard", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (!showToast) return;
    const t = window.setTimeout(() => setShowToast(false), 6000);
    return () => window.clearTimeout(t);
  }, [showToast]);

  // Stat card values
  const repoCount = usage?.repoCount ?? 0;
  const totalFiles = usage?.totalFiles ?? 0;
  const messagesCount = usage?.messagesThisMonth ?? 0;
  const messagesLimit = usage?.messagesLimit ?? 50;
  const featuresUsed =
    (usage?.docsGenerated ?? 0) +
    (usage?.prReviewsCount ?? 0) +
    (usage?.complexityScoresCount ?? 0);

  const aiMessagesValue = usageLoading
    ? "—"
    : isPro
      ? messagesCount
      : `${messagesCount}/${messagesLimit}`;

  return (
    <>
      {showToast ? (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-border bg-card px-4 py-3 text-sm shadow-lg"
        >
          Welcome to Pro! Your account has been upgraded.
        </div>
      ) : null}

      <div className="space-y-8">
        {/* Greeting */}
        <div className="rounded-lg border border-border bg-brand-light/50 px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight">
            {greetingForNow()}, {firstName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your repositories.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Repositories"
            value={usageLoading ? "—" : repoCount}
            icon={GitBranch}
          />
          <StatCard
            label="Files Indexed"
            value={usageLoading ? "—" : totalFiles.toLocaleString()}
            icon={FileCode}
          />
          <StatCard
            label="AI Messages"
            value={aiMessagesValue}
            icon={MessageSquare}
          />
          <StatCard
            label="Features Used"
            value={usageLoading ? "—" : featuresUsed}
            icon={isPro && !usageLoading ? Crown : Zap}
          />
        </div>

        {/* Quick Actions */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <GitBranch className="mb-2 h-8 w-8 text-brand" aria-hidden />
                <CardTitle className="text-base">Add Repository</CardTitle>
                <CardDescription>Connect a GitHub repo to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/repos">Add Repo</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <MessageSquare className="mb-2 h-8 w-8 text-brand" aria-hidden />
                <CardTitle className="text-base">Start AI Chat</CardTitle>
                <CardDescription>Ask questions about your codebase</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/chat">Open Chat</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="mb-2 h-8 w-8 text-brand" aria-hidden />
                <CardTitle className="text-base">Generate Docs</CardTitle>
                <CardDescription>Auto-generate documentation</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/docs">Generate</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Usage meters — FREE only */}
        {!isPro && usage ? (
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">This Month&apos;s Usage</h3>
            <div className="grid grid-cols-1 gap-6 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
              <UsageMeter
                used={usage.messagesThisMonth}
                limit={usage.messagesLimit ?? 50}
                label="messages this month"
              />
              <UsageMeter
                used={usage.repoCount}
                limit={usage.repoLimit ?? 1}
                label="repositories"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              <Link
                href="/dashboard/billing"
                className="font-medium text-brand hover:underline"
              >
                Upgrade to Pro for unlimited usage →
              </Link>
            </p>
          </section>
        ) : null}

        {/* Recent Activity */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <div className="rounded-lg border border-border bg-card">
            <ActivityFeed />
          </div>
        </section>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Loading…
        </div>
      }
    >
      <DashboardHome />
    </Suspense>
  );
}
