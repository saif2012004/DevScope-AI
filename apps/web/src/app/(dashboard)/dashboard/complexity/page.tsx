"use client";

import {
  AlertTriangle,
  BarChart2,
  FileCode,
  FlaskConical,
  ListChecks,
  Package,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/EmptyState";
import { Spinner } from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSetPageTitle } from "@/context/PageTitleContext";
import { useRepos } from "@/hooks/useRepos";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type AffectedFile = {
  path: string;
  changeType: "modify" | "create" | "delete" | "uncertain";
  reason: string;
  complexity: "low" | "medium" | "high";
};

type Risk = {
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  mitigation: string;
};

type PlanStep = {
  step: number;
  title: string;
  description: string;
  estimatedHours: number;
};

type ComplexityResult = {
  taskDescription: string;
  repoOwner: string;
  repoName: string;
  effortScore: number;
  effortLabel: string;
  estimatedHours: { min: number; max: number };
  estimatedDays: { min: number; max: number };
  affectedFiles: AffectedFile[];
  risks: Risk[];
  implementationPlan: PlanStep[];
  dependencies: string[];
  testingConsiderations: string;
  summary: string;
  tokensUsed: number;
};

type PastScore = {
  id: string;
  taskDescription: string;
  effortScore: number;
  effortLabel: string;
  estimatedHoursMin: number;
  estimatedHoursMax: number;
  affectedFilesCount: number;
  risksCount: number;
  fullResult: ComplexityResult;
  createdAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const EXAMPLE_TASKS = [
  "Add rate limiting to all API endpoints",
  "Implement dark mode toggle",
  "Add email notifications for subscription expiry",
  "Migrate authentication from JWT to sessions",
];

const STATUS_MESSAGES = [
  "Searching codebase for relevant context...",
  "Running 3 parallel semantic searches...",
  "Analyzing task complexity...",
  "Building implementation plan...",
];

function effortScoreColor(score: number): string {
  if (score <= 2) return "text-green-600";
  if (score <= 4) return "text-blue-600";
  if (score <= 6) return "text-yellow-600";
  if (score <= 8) return "text-orange-600";
  return "text-red-600";
}

function effortBadgeClasses(score: number): string {
  if (score <= 2) return "bg-green-100 text-green-800";
  if (score <= 4) return "bg-blue-100 text-blue-800";
  if (score <= 6) return "bg-yellow-100 text-yellow-800";
  if (score <= 8) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

function changeTypeBadge(t: AffectedFile["changeType"]) {
  const map: Record<AffectedFile["changeType"], string> = {
    modify: "bg-blue-100 text-blue-700",
    create: "bg-green-100 text-green-700",
    delete: "bg-red-100 text-red-700",
    uncertain: "bg-gray-100 text-gray-600",
  };
  return map[t];
}

function complexityBadge(c: AffectedFile["complexity"]) {
  const map: Record<AffectedFile["complexity"], string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };
  return map[c];
}

function riskBorder(s: Risk["severity"]) {
  const map: Record<Risk["severity"], string> = {
    high: "border-red-500 bg-red-50/50",
    medium: "border-yellow-500 bg-yellow-50/50",
    low: "border-blue-500 bg-blue-50/50",
  };
  return map[s];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EffortGauge({ score, label }: { score: number; label: string }) {
  const R = 34;
  const circ = 2 * Math.PI * R; // ≈ 213.6
  const offset = circ - (score / 10) * circ;
  const colorClass = effortScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={cn("text-7xl font-bold leading-none", colorClass)}>
        {score}
      </span>
      <svg viewBox="0 0 80 80" width={80} height={80}>
        <circle
          cx={40}
          cy={40}
          r={R}
          stroke="#e5e7eb"
          strokeWidth={6}
          fill="none"
        />
        <circle
          cx={40}
          cy={40}
          r={R}
          stroke="currentColor"
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          className={colorClass}
        />
      </svg>
      <span className="text-xl font-semibold">{label}</span>
    </div>
  );
}

function ResultView({
  result,
  onNewEstimate,
}: {
  result: ComplexityResult;
  onNewEstimate: () => void;
}) {
  const sortedRisks = [...result.risks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  function handleCopyPath(path: string) {
    void navigator.clipboard.writeText(path).then(() => {
      toast.success(`Copied: ${path}`);
    });
  }

  function handleCopySummary() {
    const text = [
      `Complexity Estimate: ${result.effortLabel} (${result.effortScore}/10)`,
      `Time: ${result.estimatedHours.min}-${result.estimatedHours.max} hours`,
      `Files affected: ${result.affectedFiles.length}`,
      `Risks: ${result.risks.length}`,
      ``,
      `Summary: ${result.summary}`,
    ].join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      toast.success("Summary copied to clipboard");
    });
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-6 p-6 pb-24">
        {/* Hero card */}
        <div className="border border-border rounded-xl p-6">
          <div className="flex gap-6 flex-wrap">
            <EffortGauge score={result.effortScore} label={result.effortLabel} />
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
              <p className="text-2xl font-medium">
                {result.estimatedHours.min}–{result.estimatedHours.max} hours{" "}
                <span className="text-base text-muted-foreground font-normal">
                  ({result.estimatedDays.min}–{result.estimatedDays.max} days)
                </span>
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {result.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Affected files */}
        {result.affectedFiles.length > 0 && (
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileCode className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">Affected Files</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {result.affectedFiles.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">File</th>
                    <th className="pb-2 font-medium pl-3">Change</th>
                    <th className="pb-2 font-medium pl-3">Complexity</th>
                    <th className="pb-2 font-medium pl-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.affectedFiles.map((f, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          className="font-mono text-xs text-left hover:text-brand transition-colors cursor-copy"
                          title={f.path}
                          onClick={() => handleCopyPath(f.path)}
                        >
                          {f.path}
                        </button>
                      </td>
                      <td className="py-2 pl-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            changeTypeBadge(f.changeType),
                          )}
                        >
                          {f.changeType}
                        </span>
                      </td>
                      <td className="py-2 pl-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            complexityBadge(f.complexity),
                          )}
                        >
                          {f.complexity}
                        </span>
                      </td>
                      <td
                        className="py-2 pl-3 text-xs text-muted-foreground max-w-[200px] truncate"
                        title={f.reason}
                      >
                        {f.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Implementation plan */}
        {result.implementationPlan.length > 0 && (
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">Implementation Plan</span>
            </div>
            <ol className="space-y-0">
              {result.implementationPlan.map((step, idx) => {
                const isLast = idx === result.implementationPlan.length - 1;
                return (
                  <li key={step.step} className="flex gap-4 items-start pb-4 relative">
                    {!isLast && (
                      <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-medium shrink-0 z-10">
                      {step.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{step.title}</span>
                        <span className="text-xs bg-muted px-2 rounded-full">
                          ~{step.estimatedHours}h
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Risks */}
        {sortedRisks.length > 0 && (
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">Risks</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {sortedRisks.length}
              </span>
            </div>
            {sortedRisks.map((risk, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg p-4 mb-3 border-l-4 last:mb-0",
                  riskBorder(risk.severity),
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium capitalize px-2 py-0.5 rounded-full",
                      risk.severity === "high"
                        ? "bg-red-100 text-red-700"
                        : risk.severity === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700",
                    )}
                  >
                    {risk.severity}
                  </span>
                  <span className="font-medium text-sm">{risk.title}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {risk.description}
                </p>
                <div>
                  <span className="text-xs font-medium">Mitigation: </span>
                  <p className="bg-muted rounded p-2 text-sm mt-1">
                    {risk.mitigation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dependencies */}
        {result.dependencies.length > 0 && (
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">Dependencies</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.dependencies.map((dep) => (
                <span
                  key={dep}
                  className="bg-muted rounded-full px-3 py-1 text-sm font-mono"
                >
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Testing */}
        <div className="border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="font-semibold">Testing Considerations</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.testingConsiderations}
          </p>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4 flex gap-3">
        <Button type="button" className="gap-2" onClick={handleCopySummary}>
          Copy Summary
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onNewEstimate}
        >
          New Estimate
        </Button>
      </div>
    </div>
  );
}

function LoadingView() {
  const [progressVal, setProgressVal] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const progressId = setInterval(() => {
      setProgressVal((v) => {
        const next = v + 95 / 30; // reach ~95% in 15s (500ms intervals)
        return Math.min(next, 95);
      });
    }, 500);

    const msgId = setInterval(() => {
      setMsgIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 4000);

    return () => {
      clearInterval(progressId);
      clearInterval(msgId);
    };
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <BarChart2
        className="animate-pulse text-brand"
        size={48}
        aria-hidden
      />
      <p className="text-lg font-semibold">Estimating complexity...</p>
      <div className="w-full max-w-sm">
        <Progress value={progressVal} className="h-2" />
      </div>
      <p className="text-sm text-muted-foreground">{STATUS_MESSAGES[msgIndex]}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ComplexityPage() {
  useSetPageTitle("Complexity Scorer");

  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [task, setTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ComplexityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: allRepos = [] } = useRepos();
  const indexedRepos = allRepos.filter((r) => r.status === "INDEXED");

  const { data: pastScores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ["complexity-scores", selectedRepoId],
    queryFn: async () => {
      const res = await api.get<PastScore[]>(
        `/api/complexity/${selectedRepoId}`,
      );
      return res.data;
    },
    enabled: !!selectedRepoId,
  });

  const charCount = task.length;
  const isOverLimit = charCount > 1000;
  const canSubmit =
    !!selectedRepoId &&
    task.trim().length >= 10 &&
    !isOverLimit &&
    !isLoading;

  async function handleEstimate() {
    if (!canSubmit) return;
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const res = await api.post<ComplexityResult>("/api/complexity/score", {
        repoId: selectedRepoId,
        taskDescription: task.trim(),
      });
      setResult(res.data);
      void queryClient.invalidateQueries({
        queryKey: ["complexity-scores", selectedRepoId],
      });
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { error?: string } } }).response?.data?.error
          ? (err as { response: { data: { error: string } } }).response.data.error
          : "Failed to estimate complexity. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleChipClick(text: string) {
    setTask(text);
    textareaRef.current?.focus();
  }

  function handleNewEstimate() {
    setResult(null);
    setTask("");
    setError(null);
    textareaRef.current?.focus();
  }

  function loadPastScore(score: PastScore) {
    setResult(score.fullResult);
  }

  return (
    <div
      className="flex -m-6 overflow-hidden"
      style={{ height: "calc(100svh - var(--header-height))" }}
    >
      {/* ── Left panel ── */}
      <div className="flex w-[400px] shrink-0 flex-col border-r border-border overflow-hidden">
        {/* Top section */}
        <div className="space-y-4 border-b border-border p-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-brand" aria-hidden />
            <h2 className="font-semibold">Complexity Scorer</h2>
          </div>

          {/* Repo selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="repo-select-cx"
              className="block text-xs font-medium text-muted-foreground"
            >
              Select Repository
            </label>
            <select
              id="repo-select-cx"
              value={selectedRepoId}
              onChange={(e) => {
                setSelectedRepoId(e.target.value);
                setResult(null);
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

          {/* Task textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="task-input"
              className="block text-xs font-medium text-muted-foreground"
            >
              Describe the task or feature
            </label>
            <textarea
              id="task-input"
              ref={textareaRef}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Add email notifications when a user's subscription expires. Users should receive an email 3 days before and on the day their subscription ends."
              rows={5}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[120px] max-h-[240px]",
                isOverLimit ? "border-destructive" : "border-input",
              )}
            />
            <p
              className={cn(
                "text-right text-xs",
                isOverLimit ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {charCount} / 1000
            </p>
          </div>

          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}

          <Button
            type="button"
            className="w-full gap-2 bg-brand text-white hover:bg-brand-dark"
            disabled={!canSubmit}
            onClick={() => void handleEstimate()}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="border-white border-t-transparent" />
                Analyzing codebase...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" aria-hidden />
                Estimate Complexity
              </>
            )}
          </Button>
        </div>

        {/* Past estimates */}
        <div className="flex-1 overflow-y-auto p-3 border-t border-border mt-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Past Estimates
          </p>

          {!selectedRepoId ? (
            <p className="text-xs text-muted-foreground">
              Select a repository to see past estimates.
            </p>
          ) : scoresLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : pastScores.length === 0 ? (
            <p className="text-xs text-muted-foreground">No estimates yet.</p>
          ) : (
            <ul className="space-y-1">
              {pastScores.map((score) => (
                <li key={score.id}>
                  <button
                    type="button"
                    className="w-full rounded p-3 text-left transition-colors hover:bg-accent"
                    onClick={() => loadPastScore(score)}
                  >
                    <p className="text-sm truncate mb-1">
                      {score.taskDescription.slice(0, 55)}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            effortBadgeClasses(score.effortScore),
                          )}
                        >
                          {score.effortLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {score.estimatedHoursMin}–{score.estimatedHoursMax}h
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(score.createdAt)}
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
          <LoadingView />
        ) : result ? (
          <ResultView result={result} onNewEstimate={handleNewEstimate} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <EmptyState
              icon={BarChart2}
              title="Estimate Task Complexity"
              description="Describe a feature or task and get a detailed effort estimate with affected files, risks, and an implementation plan."
            />
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
              {EXAMPLE_TASKS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleChipClick(example)}
                  className="border border-border rounded-full px-3 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
