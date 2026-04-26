"use client";

import { GitBranch } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AddRepoModal } from "@/components/repos/AddRepoModal";
import { RepoCard } from "@/components/repos/RepoCard";
import { RepoCardSkeleton } from "@/components/repos/RepoCardSkeleton";
import { UsageBanner } from "@/components/repos/UsageBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { useSetPageTitle } from "@/context/PageTitleContext";
import { useDeleteRepo, useRepos } from "@/hooks/useRepos";
import { toast } from "@/lib/toast";
import type { Repo } from "@/types/repo";

type CurrentUser = { plan: "FREE" | "PRO" };

export default function ReposPage() {
  useSetPageTitle("Repositories");
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () =>
      queryClient.getQueryData<CurrentUser>(["currentUser"]) ?? null,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const { data: repos = [], isLoading, isError } = useRepos();
  const deleteRepo = useDeleteRepo();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Repo | null>(null);

  const isFreePlan = currentUser?.plan !== "PRO";

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    const id = deleteTarget.id;
    try {
      await deleteRepo.mutateAsync(id);
      toast.success("Repository deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete repository");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RepoCardSkeleton />
          <RepoCardSkeleton />
          <RepoCardSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load repositories. Please try again.
      </p>
    );
  }

  if (repos.length === 0) {
    return (
      <>
        <div className="space-y-8">
          <EmptyState
            icon={GitBranch}
            title="No repositories yet"
            description="Add your first GitHub repository to start getting AI-powered insights"
            action={{
              label: "Add Repository",
              onClick: () => setAddOpen(true),
            }}
          />
        </div>
        <AddRepoModal
          open={addOpen}
          onOpenChange={setAddOpen}
          userPlan={currentUser?.plan}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Repositories"
          description="Manage your connected GitHub repositories"
          action={
            <Button type="button" onClick={() => setAddOpen(true)}>
              Add Repository
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              onDelete={(r) => setDeleteTarget(r)}
            />
          ))}
        </div>

        {isFreePlan ? <UsageBanner repoCount={repos.length} /> : null}
      </div>

      <AddRepoModal
        open={addOpen}
        onOpenChange={setAddOpen}
        userPlan={currentUser?.plan}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Repository</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-foreground">
                    {deleteTarget.githubOwner}/{deleteTarget.githubName}
                  </span>
                  ? This will permanently delete all chat history and indexed
                  data for this repository. This action cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteRepo.isPending}
              onClick={() => void confirmDelete()}
            >
              {deleteRepo.isPending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
