"use client";

import { CheckCircle, CreditCard, Crown, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, Suspense, useEffect, useState } from "react";
import axios from "axios";

import { PlanBadge } from "@/components/shared/PlanBadge";
import { Spinner } from "@/components/shared/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSetPageTitle } from "@/context/PageTitleContext";
import {
  useBillingStatus,
  useCreateCheckoutSession,
  useCreatePortalSession,
} from "@/hooks/useBilling";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const CHECKOUT_ERROR = "Something went wrong. Please try again.";

function BillingContent() {
  useSetPageTitle("Billing & Plan");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showUpgradedAlert, setShowUpgradedAlert] = useState(false);

  const { data: billing, isLoading, isError, error } = useBillingStatus();
  const checkout = useCreateCheckoutSession();
  const portal = useCreatePortalSession();

  const isPro = billing?.plan === "PRO";

  // Stripe not configured — show neutral "coming soon" card
  const isBillingUnavailable =
    isError &&
    axios.isAxiosError(error) &&
    error.response?.status === 503;

  useEffect(() => {
    if (searchParams.get("upgraded") !== "true") {
      return;
    }
    startTransition(() => {
      setShowUpgradedAlert(true);
    });
    router.replace("/dashboard/billing", { scroll: false });
  }, [searchParams, router]);

  function openCheckout() {
    checkout.mutate(undefined, {
      onSuccess: (url) => {
        if (url) {
          window.location.href = url;
        }
      },
      onError: () => {
        toast.error(CHECKOUT_ERROR);
      },
    });
  }

  function openPortal() {
    portal.mutate(undefined, {
      onSuccess: (url) => {
        if (url) {
          window.location.href = url;
        }
      },
      onError: () => {
        toast.error(CHECKOUT_ERROR);
      },
    });
  }

  if (isBillingUnavailable) {
    return (
      <div className="mx-auto max-w-sm rounded-lg bg-muted p-6 text-center">
        <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold">Billing Coming Soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Payment processing is being configured. Check back soon.
        </p>
      </div>
    );
  }

  if (isLoading || !billing) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner size="sm" />
        Loading billing…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {showUpgradedAlert ? (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40">
          <CheckCircle
            className="h-4 w-4 text-green-600 dark:text-green-400"
            aria-hidden
          />
          <AlertTitle className="text-green-900 dark:text-green-100">
            You&apos;re now on Pro!
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            Your account has been upgraded. All features are now unlocked.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Section 1 — Current plan banner */}
      {isPro ? (
        <div className="flex flex-col gap-4 rounded-xl border border-brand/20 bg-brand-light p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">Pro Plan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You have access to all features.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-200">
              Active
            </span>
            <Button
              type="button"
              variant="outline"
              className="min-w-[180px]"
              disabled={portal.isPending}
              onClick={openPortal}
            >
              {portal.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner
                    size="sm"
                    className="border-muted-foreground border-t-transparent"
                  />
                  Opening…
                </span>
              ) : (
                "Manage Subscription"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl bg-gradient-to-r from-purple-50 to-amber-50 p-6 dark:from-purple-950/30 dark:to-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/80 text-amber-700 shadow-sm dark:bg-background/80 dark:text-amber-400">
              <Crown className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">Free Plan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;re on the free plan. Upgrade to unlock everything.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full shrink-0 bg-brand text-white hover:bg-brand-dark sm:w-auto"
            disabled={checkout.isPending}
            onClick={openCheckout}
          >
            {checkout.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner
                  size="sm"
                  className="border-white border-t-transparent"
                />
                Loading…
              </span>
            ) : (
              "Upgrade to Pro →"
            )}
          </Button>
        </div>
      )}

      {/* Section 2 — Plan comparison */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col border-border shadow-sm">
          <CardContent className="flex flex-1 flex-col p-6">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">Free</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started for free
              </p>
            </div>
            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
              {[
                "1 GitHub repository",
                "50 AI messages per month",
                "Codebase Q&A",
                "Basic documentation",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {!isPro ? (
                <span className="inline-flex rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  Current plan
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "relative flex flex-col overflow-hidden border-2 border-brand shadow-md",
          )}
        >
          <span className="absolute right-4 top-4 z-10 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">
            Most Popular
          </span>
          <CardContent className="flex flex-1 flex-col p-6 pt-14">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$12</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Everything you need
              </p>
            </div>
            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
              {[
                "Unlimited repositories",
                "Unlimited AI messages",
                "Codebase Q&A",
                "Auto documentation generation",
                "PR review bot",
                "Complexity scorer",
                "Priority support",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isPro ? (
                <span className="inline-flex rounded-full border border-brand/30 bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                  Current plan
                </span>
              ) : (
                <Button
                  type="button"
                  className="w-full bg-brand text-white hover:bg-brand-dark"
                  disabled={checkout.isPending}
                  onClick={openCheckout}
                >
                  {checkout.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner
                        size="sm"
                        className="border-white border-t-transparent"
                      />
                      Loading…
                    </span>
                  ) : (
                    "Upgrade to Pro"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3 — Billing history (Pro only) */}
      {isPro ? (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Billing History</h2>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3">$12.00</td>
                    <td className="px-4 py-3">
                      <span className="text-green-700 dark:text-green-400">
                        Paid
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-medium text-brand hover:underline"
                        onClick={openPortal}
                        disabled={portal.isPending}
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Full billing history is available in the Stripe Customer Portal.{" "}
              <button
                type="button"
                className="font-medium text-brand hover:underline disabled:opacity-50"
                onClick={openPortal}
                disabled={portal.isPending}
              >
                Open Portal →
              </button>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner size="sm" />
          Loading…
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
