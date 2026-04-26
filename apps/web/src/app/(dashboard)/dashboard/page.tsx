"use client";

import { useUser } from "@clerk/nextjs";
import {
  BookOpen,
  Crown,
  FileCode,
  FileText,
  GitBranch,
  MessageSquare,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, Suspense, useEffect, useState } from "react";

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

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardHome() {
  useSetPageTitle("Dashboard");
  const { user } = useUser();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  const firstName = user?.firstName || "there";

  useEffect(() => {
    if (searchParams.get("upgraded") !== "true") {
      return;
    }
    startTransition(() => {
      setShowToast(true);
    });
    router.replace("/dashboard", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (!showToast) {
      return;
    }
    const t = window.setTimeout(() => setShowToast(false), 6000);
    return () => window.clearTimeout(t);
  }, [showToast]);

  const repoCount = usage?.repoCount ?? 0;
  const messagesCount = usage?.messagesThisMonth ?? 0;
  const isPro = usage?.plan === "PRO";
  const showUsageSection = usage?.plan === "FREE";

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
        <div className="rounded-lg border border-border bg-brand-light/50 px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight">
            {greetingForNow()}, {firstName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your repositories.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Repositories"
            value={usageLoading ? "—" : repoCount}
            icon={GitBranch}
          />
          <StatCard
            label="AI Messages"
            value={usageLoading ? "—" : messagesCount}
            icon={MessageSquare}
          />
          <StatCard label="Files Indexed" value={0} icon={FileCode} />
          <StatCard
            label="Plan"
            value={
              usageLoading
                ? "—"
                : isPro
                  ? "Pro Plan"
                  : "Free Plan"
            }
            icon={!usageLoading && isPro ? Crown : Zap}
          />
        </div>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <GitBranch className="mb-2 h-8 w-8 text-brand" aria-hidden />
                <CardTitle className="text-base">Add Repository</CardTitle>
                <CardDescription>
                  Connect a GitHub repo to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/repos">Add Repo</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <MessageSquare
                  className="mb-2 h-8 w-8 text-brand"
                  aria-hidden
                />
                <CardTitle className="text-base">Start AI Chat</CardTitle>
                <CardDescription>
                  Ask questions about your codebase
                </CardDescription>
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
                <CardDescription>
                  Auto-generate documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/docs">Generate</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {showUsageSection && usage ? (
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">This Month&apos;s Usage</h3>
            <div className="grid grid-cols-1 gap-6 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
              <UsageMeter
                used={usage.messagesThisMonth}
                limit={usage.messagesLimit}
                label="messages"
              />
              <UsageMeter
                used={usage.repoCount}
                limit={usage.repoLimit}
                label="repositories"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              <Link
                href="/dashboard/billing"
                className="font-medium text-brand hover:underline"
              >
                Upgrade to Pro for unlimited usage
              </Link>
            </p>
          </section>
        ) : null}

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              icon={BookOpen}
              title="No activity yet"
              description="Add a repository to get started"
            />
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
