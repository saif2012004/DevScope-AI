"use client";

import { Github, MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { StatusBadge } from "@/components/repos/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const filesLabel =
    repo.totalFiles === 0 ? "—" : `${repo.totalFiles} files`;
  const chunksLabel =
    repo.totalChunks === 0 ? "—" : `${repo.totalChunks} chunks`;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Github
              className="mt-0.5 h-6 w-6 shrink-0 text-foreground"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">
                {repo.githubOwner}/{repo.githubName}
              </p>
            </div>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        <p className="text-sm text-muted-foreground">
          <span>{filesLabel}</span>
          <span className="mx-2 text-border">·</span>
          <span>{chunksLabel}</span>
        </p>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
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
      </CardContent>
    </Card>
  );
}
