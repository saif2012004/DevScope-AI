"use client";

import { FileCode, Github, MessageSquare, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { StatusBadge } from "@/components/repos/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { toast } from "@/lib/toast";
import type { Repo } from "@/types/repo";

export function RepoCard({
  repo,
  onDelete,
}: {
  repo: Repo;
  onDelete: (repo: Repo) => void;
}) {
  const router = useRouter();
  const prevStatusRef = useRef(repo.status);

  useEffect(() => {
    if (prevStatusRef.current !== "INDEXED" && repo.status === "INDEXED") {
      toast.success(`${repo.githubOwner}/${repo.githubName} is ready!`, {
        description: "Your repository has been indexed and is ready for AI chat.",
        action: {
          label: "Open Chat",
          onClick: () => router.push(`/dashboard/chat?repoId=${repo.id}`),
        },
        duration: 8000,
      });
    }
    prevStatusRef.current = repo.status;
  }, [repo.status, repo.githubOwner, repo.githubName, repo.id, router]);

  const filesLabel = repo.totalFiles === 0 ? "—" : repo.totalFiles.toLocaleString();
  const chunksLabel = repo.totalChunks === 0 ? "—" : repo.totalChunks.toLocaleString();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur transition-colors hover:border-[hsl(263_85%_60%/0.4)]"
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[hsl(263_85%_60%/0.18)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      />

      <div className="relative space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/60">
              <Github className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{repo.githubOwner}</p>
              <p className="truncate font-semibold leading-tight">
                {repo.githubName}
              </p>
            </div>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-white/[0.02] px-3 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <FileCode className="h-3.5 w-3.5 text-[hsl(263_85%_75%)]" />
            <span className="font-medium text-foreground tabular-nums">{filesLabel}</span> files
          </span>
          <span className="h-3 w-px bg-border/60" />
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{chunksLabel}</span> chunks
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-4">
          <p className="text-xs text-muted-foreground">
            Added {formatRelativeTime(repo.createdAt)}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" asChild className="h-9 w-9">
              <Link
                href={`/dashboard/chat?repoId=${encodeURIComponent(repo.id)}`}
                aria-label="Open chat for this repository"
              >
                <MessageSquare className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              aria-label="Delete repository"
              onClick={() => onDelete(repo)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
