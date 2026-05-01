"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  GitPullRequest,
  Lightbulb,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/EmptyState";
import { Spinner } from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { useSetPageTitle } from "@/context/PageTitleContext";
import { useRepos } from "@/hooks/useRepos";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Issue = {
  severity: "critical" | "warning" | "suggestion";
  filename: string;
  line?: number;
  title: string;
  description: string;
  suggestedFix?: string;
};

type ReviewResult = {
  summary: string;
  overallVerdict: "approve" | "request_changes" | "comment";
  issues: Issue[];
  positives: string[];
  fullReviewMarkdown: string;
  tokensUsed: number;
  prTitle: string;
  prNumber: number;
};

type PastReview = {
  id: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  verdict: string;
  summary: string;
  fullReview: string;
  issueCount: number;
  tokensUsed: number;
  createdAt: string;
};

type DisplayReview = {
  prNumber: number;
  prTitle: string;
  overallVerdict: "approve" | "request_changes" | "comment";
  summary: string;
  issues: Issue[];
  positives: string[];
  fullReviewMarkdown: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PR_URL_RE = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

const STATUS_MESSAGES = [
  "Fetching changed files from GitHub...",
  "Searching codebase for relevant context...",
  "Running code review analysis...",
  "Generating review with Gemini...",
];

// ── Verdict helpers ───────────────────────────────────────────────────────────

function VerdictBadge({
  verdict,
  size = "sm",
}: {
  verdict: string;
  size?: "sm" | "lg";
}) {
  const base = size === "lg" ? "px-3 py-1 text-sm font-semibold" : "px-2 py-0.5 text-xs font-medium";
  if (verdict === "approve") {
    return (
      <span className={cn("rounded-full bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200", base)}>
        Approved
      </span>
    );
  }
  if (verdict === "request_changes") {
    return (
      <span className={cn("rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", base)}>
        Changes Requested
      </span>
    );
  }
  return (
    <span className={cn("rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", base)}>
      Commented
    </span>
  );
}

// ── Right panel states ────────────────────────────────────────────────────────

function EmptyRight() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <EmptyState
        icon={GitPullRequest}
        title="Analyze a Pull Request"
        description="Paste a GitHub PR URL to get an AI code review comparing the changes against your indexed codebase."
      />
    </div>
  );
}

function LoadingRight() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <Loader2 className="h-10 w-10 animate-spin text-brand" aria-hidden />
      <p className="text-lg font-semibold">Analyzing PR...</p>
      <p className="text-sm text-muted-foreground transition-all">
        {STATUS_MESSAGES[msgIndex]}
      </p>
    </div>
  );
}

function ReviewRight({ review }: { review: DisplayReview }) {
  const [copied, setCopied] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);

  const criticalIssues = review.issues.filter((i) => i.severity === "critical");
  const warningIssues = review.issues.filter((i) => i.severity === "warning");
  const suggestionIssues = review.issues.filter((i) => i.severity === "suggestion");

  function handleCopy() {
    void navigator.clipboard.writeText(review.fullReviewMarkdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header card */}
      <div className="rounded-lg bg-muted p-4">
        <p className="font-mono text-sm text-muted-foreground">
          PR #{review.prNumber}
        </p>
        <h2 className="mt-1 text-xl font-bold leading-snug">{review.prTitle}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <VerdictBadge verdict={review.overallVerdict} size="lg" />
          {review.fullReviewMarkdown ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleCopy}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? "Copied!" : "Copy Review"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Summary
        </p>
        <p className="text-sm leading-relaxed">{review.summary}</p>
      </div>

      {/* Issues */}
      {review.issues.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Issues Found</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {review.issues.length}
            </span>
          </div>

          {criticalIssues.length > 0 && (
            <IssueGroup
              title="Critical Issues"
              issues={criticalIssues}
              icon={<AlertCircle className="h-4 w-4" aria-hidden />}
              borderColor="border-red-500"
              textColor="text-red-700 dark:text-red-400"
              issueBorderColor="border-red-500"
            />
          )}
          {warningIssues.length > 0 && (
            <IssueGroup
              title="Warnings"
              issues={warningIssues}
              icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
              borderColor="border-yellow-500"
              textColor="text-yellow-700 dark:text-yellow-400"
              issueBorderColor="border-yellow-500"
            />
          )}
          {suggestionIssues.length > 0 && (
            <IssueGroup
              title="Suggestions"
              issues={suggestionIssues}
              icon={<Lightbulb className="h-4 w-4" aria-hidden />}
              borderColor="border-blue-500"
              textColor="text-blue-700 dark:text-blue-400"
              issueBorderColor="border-blue-500"
            />
          )}
        </div>
      )}

      {/* Positives */}
      {review.positives.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden />
            <h3 className="font-semibold">What Was Done Well</h3>
          </div>
          <ul className="space-y-1">
            {review.positives.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                  aria-hidden
                />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full review markdown (collapsible) */}
      {review.fullReviewMarkdown ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setFullOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View Full Review Markdown
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                fullOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {fullOpen && (
            <div className="rounded-lg border border-border p-4 prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {review.fullReviewMarkdown}
              </ReactMarkdown>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function IssueGroup({
  title,
  issues,
  icon,
  borderColor,
  textColor,
  issueBorderColor,
}: {
  title: string;
  issues: Issue[];
  icon: React.ReactNode;
  borderColor: string;
  textColor: string;
  issueBorderColor: string;
}) {
  return (
    <div className={cn("border-l-4 pl-4", borderColor)}>
      <div className={cn("mb-2 flex items-center gap-2 font-medium", textColor)}>
        {icon}
        {title}
      </div>
      <div className="space-y-2">
        {issues.map((issue, i) => (
          <div
            key={i}
            className={cn(
              "rounded border-l-2 bg-background p-4",
              issueBorderColor,
            )}
          >
            <p className="font-medium">{issue.title}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {issue.filename}
              {issue.line ? ` · Line ${issue.line}` : ""}
            </p>
            <p className="mt-2 text-sm leading-relaxed">{issue.description}</p>
            {issue.suggestedFix ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  Suggested fix:
                </p>
                <pre className="rounded bg-muted p-3 font-mono text-sm whitespace-pre-wrap">
                  {issue.suggestedFix}
                </pre>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PRReviewPage() {
  useSetPageTitle("PR Review");

  const queryClient = useQueryClient();
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentReview, setCurrentReview] = useState<DisplayReview | null>(null);

  const { data: allRepos = [] } = useRepos();
  const indexedRepos = allRepos.filter((r) => r.status === "INDEXED");

  const { data: pastReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["pr-reviews", selectedRepoId],
    queryFn: async () => {
      const res = await api.get<PastReview[]>(
        `/api/pr-review/${selectedRepoId}`,
      );
      return res.data;
    },
    enabled: !!selectedRepoId,
  });

  function validateUrl(val: string): boolean {
    return PR_URL_RE.test(val.trim());
  }

  function handleUrlBlur() {
    if (prUrl && !validateUrl(prUrl)) {
      setUrlError(
        "Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123",
      );
    } else {
      setUrlError(null);
    }
  }

  async function handleAnalyze() {
    if (!selectedRepoId || !prUrl || !validateUrl(prUrl)) return;
    setUrlError(null);
    setIsLoading(true);
    setCurrentReview(null);

    try {
      const res = await api.post<ReviewResult>("/api/pr-review/analyze", {
        repoId: selectedRepoId,
        prUrl: prUrl.trim(),
      });

      const result = res.data;

      setCurrentReview({
        prNumber: result.prNumber,
        prTitle: result.prTitle,
        overallVerdict: result.overallVerdict,
        summary: result.summary,
        issues: result.issues,
        positives: result.positives,
        fullReviewMarkdown: result.fullReviewMarkdown,
      });

      void queryClient.invalidateQueries({
        queryKey: ["pr-reviews", selectedRepoId],
      });
    } catch (err) {
      console.error(err);
      setCurrentReview({
        prNumber: 0,
        prTitle: "Review Failed",
        overallVerdict: "comment",
        summary: "Failed to analyze PR. Please check the URL and try again.",
        issues: [],
        positives: [],
        fullReviewMarkdown: "",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function loadPastReview(review: PastReview) {
    const verdict = (
      ["approve", "request_changes", "comment"].includes(review.verdict)
        ? review.verdict
        : "comment"
    ) as DisplayReview["overallVerdict"];

    setCurrentReview({
      prNumber: review.prNumber,
      prTitle: review.prTitle,
      overallVerdict: verdict,
      summary: review.summary,
      issues: [],
      positives: [],
      fullReviewMarkdown: review.fullReview,
    });
  }

  const isUrlValid = validateUrl(prUrl);
  const canAnalyze = !!selectedRepoId && !!prUrl && isUrlValid && !isLoading;

  return (
    <div className="flex -m-6 overflow-hidden" style={{ height: "calc(100svh - var(--header-height))" }}>
      {/* ── Left panel ── */}
      <div className="flex w-[380px] shrink-0 flex-col border-r border-border overflow-hidden">
        {/* Top section */}
        <div className="space-y-4 border-b border-border p-4">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-brand" aria-hidden />
            <h2 className="font-semibold">PR Review Bot</h2>
          </div>

          {/* Repo selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="repo-select-pr"
              className="block text-xs font-medium text-muted-foreground"
            >
              Select Repository
            </label>
            <select
              id="repo-select-pr"
              value={selectedRepoId}
              onChange={(e) => {
                setSelectedRepoId(e.target.value);
                setCurrentReview(null);
              }}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— choose a repo —</option>
              {indexedRepos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.githubOwner}/{repo.githubName}
                </option>
              ))}
            </select>
          </div>

          {/* PR URL input */}
          <div className="space-y-1.5">
            <label
              htmlFor="pr-url"
              className="block text-xs font-medium text-muted-foreground"
            >
              GitHub Pull Request URL
            </label>
            <input
              id="pr-url"
              type="url"
              value={prUrl}
              onChange={(e) => {
                setPrUrl(e.target.value);
                if (urlError) setUrlError(null);
              }}
              onBlur={handleUrlBlur}
              placeholder="https://github.com/owner/repo/pull/123"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {urlError ? (
              <p className="text-xs text-destructive">{urlError}</p>
            ) : null}
          </div>

          <Button
            type="button"
            className="w-full gap-2 bg-brand text-white hover:bg-brand-dark"
            disabled={!canAnalyze}
            onClick={() => void handleAnalyze()}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="border-white border-t-transparent" />
                Analyzing...
              </>
            ) : (
              <>
                <GitPullRequest className="h-4 w-4" aria-hidden />
                Analyze PR
              </>
            )}
          </Button>
        </div>

        {/* Past reviews list */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Past Reviews
          </p>

          {!selectedRepoId ? (
            <p className="text-xs text-muted-foreground">
              Select a repository to see past reviews.
            </p>
          ) : reviewsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : pastReviews.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="space-y-1">
              {pastReviews.map((review) => (
                <li key={review.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg p-3 text-left transition-colors hover:bg-accent"
                    onClick={() => loadPastReview(review)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        PR #{review.prNumber}
                      </span>
                      <VerdictBadge verdict={review.verdict} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">
                      {review.prTitle.slice(0, 50)}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {review.issueCount} issue{review.issueCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(review.createdAt)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingRight />
        ) : currentReview ? (
          <ReviewRight review={currentReview} />
        ) : (
          <EmptyRight />
        )}
      </div>
    </div>
  );
}
