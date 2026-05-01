"use client";

import {
  BarChart2,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { Spinner } from "@/components/shared/Spinner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSetPageTitle } from "@/context/PageTitleContext";
import { useDoc, useGenerateDoc } from "@/hooks/useDocs";
import { useRepos } from "@/hooks/useRepos";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { cn } from "@/lib/utils";
import type { Repo } from "@/types/repo";

const SECTION_NAMES = [
  "Project Overview",
  "Architecture and Structure",
  "Installation and Setup",
  "API Reference",
  "Key Functions and Classes",
  "Contributing Guide",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseH2Headings(markdown: string): string[] {
  return (
    markdown.match(/^## (.+)$/gm)?.map((h) => h.replace(/^## /, "")) ?? []
  );
}

// ── Markdown render components ───────────────────────────────────────────────

const markdownComponents: Components = {
  h1({ children }) {
    return (
      <h1 className="mb-4 border-b border-border pb-2 text-2xl font-bold">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    const text =
      typeof children === "string"
        ? children
        : Array.isArray(children)
          ? children.filter((c) => typeof c === "string").join("")
          : String(children ?? "");
    return (
      <h2
        id={slugify(text)}
        className="mb-4 border-b border-border pb-2 text-xl font-bold"
      >
        {children}
      </h2>
    );
  },
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  td({ children }) {
    return <td className="border border-border p-2">{children}</td>;
  },
  th({ children }) {
    return (
      <th className="border border-border bg-muted/40 p-2 text-left font-medium">
        {children}
      </th>
    );
  },
  pre({ children }) {
    return (
      <pre className="my-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm">
        {children}
      </pre>
    );
  },
  code({ className, children }) {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
        {children}
      </code>
    );
  },
};

// ── State A: repo selector grid ──────────────────────────────────────────────

function RepoGrid({
  repos,
  onSelect,
}: {
  repos: Repo[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Documentation Generator
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a repository to generate documentation
        </p>
      </div>
      {repos.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <BarChart2
            className="mx-auto mb-3 h-10 w-10 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="font-medium">No indexed repositories</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add and index a GitHub repository first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <p className="truncate font-mono text-sm font-semibold">
                  {repo.githubOwner}/{repo.githubName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {repo.totalFiles} files · {repo.totalChunks} chunks
                </p>
              </div>
              <Button
                type="button"
                className="mt-auto w-full"
                onClick={() => onSelect(repo.id)}
              >
                Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── State B: generate prompt ─────────────────────────────────────────────────

function GeneratePrompt({
  repo,
  onGenerate,
  error,
}: {
  repo: Repo;
  onGenerate: () => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText
        className="mb-4 h-16 w-16 text-brand"
        strokeWidth={1.5}
        aria-hidden
      />
      <h2 className="text-xl font-bold">Generate AI Documentation</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        DevScope AI will analyze your entire codebase and generate comprehensive
        documentation including project overview, architecture, API reference,
        key functions, and a contributing guide.
      </p>

      <div className="mt-6 w-full max-w-sm rounded-lg border border-border bg-card p-4 text-left">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Will generate
        </p>
        <ul className="space-y-2">
          {SECTION_NAMES.map((name) => (
            <li key={name} className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {name}
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="mt-6 bg-brand text-white hover:bg-brand-dark"
        onClick={onGenerate}
      >
        Generate Documentation
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Estimated time: 60–90 seconds · {repo.githubOwner}/{repo.githubName}
      </p>
    </div>
  );
}

// ── State C: generating progress ─────────────────────────────────────────────

function GeneratingView({
  progress,
  previewContent,
}: {
  progress: { currentSection: string; sectionIndex: number; totalSections: number } | null;
  previewContent: string;
}) {
  const sectionIndex = progress?.sectionIndex ?? 0;
  const progressValue = (sectionIndex / 6) * 100;
  const mdComponents = markdownComponents;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-semibold">Generating Documentation...</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {progress?.currentSection
            ? `Working on: ${progress.currentSection}`
            : "Starting…"}
        </p>
      </div>

      <Progress value={progressValue} className="h-2" />

      <div className="rounded-lg border border-border bg-card p-4">
        <ul className="space-y-2">
          {SECTION_NAMES.map((name, i) => {
            const isCompleted = i < sectionIndex;
            const isCurrent = i === sectionIndex;
            return (
              <li key={name} className="flex items-center gap-2 text-sm">
                {isCompleted ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-green-500"
                    aria-hidden
                  />
                ) : isCurrent ? (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin text-brand"
                    aria-hidden
                  />
                ) : (
                  <Circle
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    isCurrent
                      ? "font-medium"
                      : isCompleted
                        ? ""
                        : "text-muted-foreground",
                  )}
                >
                  {name}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {previewContent ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Live Preview
          </p>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={mdComponents}
            >
              {previewContent}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── State D: rendered doc ────────────────────────────────────────────────────

function DocView({
  content,
  generatedAt,
  repo,
  repoId,
  onRegenerate,
}: {
  content: string;
  generatedAt: string;
  repo: Repo;
  repoId: string;
  onRegenerate: () => void;
}) {
  const headings = parseH2Headings(content);
  const mdComponents = markdownComponents;

  async function handleDownload() {
    try {
      const res = await api.get<string>(`/api/docs/${repoId}/download`, {
        responseType: "text",
      });
      const blob = new Blob([res.data], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${repo.githubOwner}-${repo.githubName}-docs.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user sees nothing change
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${repo.githubOwner}/${repo.githubName} — Documentation`}
        description={`Last generated: ${formatRelativeTime(generatedAt)}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onRegenerate}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Regenerate
            </Button>
            <Button
              type="button"
              className="gap-2 bg-brand text-white hover:bg-brand-dark"
              onClick={() => void handleDownload()}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download .md
            </Button>
          </div>
        }
      />

      <div className="flex gap-8">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={mdComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>

        {/* ToC sidebar */}
        {headings.length > 0 ? (
          <aside className="hidden w-48 shrink-0 md:block">
            <div className="sticky top-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                On this page
              </p>
              <ul className="space-y-1">
                {headings.map((heading) => (
                  <li key={heading}>
                    <a
                      href={`#${slugify(heading)}`}
                      className="block truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {heading}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  useSetPageTitle("Documentation");

  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: allRepos = [], isLoading: reposLoading } = useRepos();
  const indexedRepos = allRepos.filter((r) => r.status === "INDEXED");

  const docQuery = useDoc(selectedRepoId);
  const { isGenerating, progress, error, generate, previewContent } =
    useGenerateDoc();

  const selectedRepo = indexedRepos.find((r) => r.id === selectedRepoId);

  function handleGenerate() {
    if (selectedRepoId) void generate(selectedRepoId);
  }

  if (reposLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  // STATE A
  if (!selectedRepoId) {
    return (
      <RepoGrid
        repos={indexedRepos}
        onSelect={(id) => setSelectedRepoId(id)}
      />
    );
  }

  // STATE C — generating (takes priority)
  if (isGenerating) {
    return (
      <GeneratingView progress={progress} previewContent={previewContent} />
    );
  }

  // Loading the doc query
  if (docQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  // STATE D — doc exists
  if (docQuery.data && selectedRepo) {
    return (
      <>
        <DocView
          content={docQuery.data.content}
          generatedAt={docQuery.data.generatedAt}
          repo={selectedRepo}
          repoId={selectedRepoId}
          onRegenerate={() => setConfirmOpen(true)}
        />
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate Documentation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will replace the existing documentation for{" "}
                <span className="font-medium text-foreground">
                  {selectedRepo.githubOwner}/{selectedRepo.githubName}
                </span>
                . The process takes 60–90 seconds.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  handleGenerate();
                }}
              >
                Regenerate
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // STATE B — no doc yet (or error / 404)
  return (
    <GeneratePrompt
      repo={selectedRepo ?? indexedRepos[0]!}
      onGenerate={handleGenerate}
      error={error}
    />
  );
}
