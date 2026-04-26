"use client";

import { useState } from "react";

import { Spinner } from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAddRepo } from "@/hooks/useRepos";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { toast } from "@/lib/toast";

const GITHUB_URL_RE =
  /^https:\/\/github.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

function normalizeGithubInput(raw: string): string {
  let s = raw.trim().replace(/\/+$/, "");
  if (s.toLowerCase().endsWith(".git")) {
    s = s.slice(0, -4);
  }
  return s;
}

export function AddRepoModal({
  open,
  onOpenChange,
  userPlan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPlan: "FREE" | "PRO" | undefined;
}) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const addRepo = useAddRepo();

  function handleOpenChange(next: boolean) {
    if (next) {
      setUrl("");
      setValidationError(null);
      setApiError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    const normalized = normalizeGithubInput(url);
    if (!GITHUB_URL_RE.test(normalized)) {
      setValidationError(
        "Invalid GitHub URL. Use format: https://github.com/owner/repo",
      );
      return;
    }
    setValidationError(null);

    try {
      await addRepo.mutateAsync(normalized);
      toast.success("Repository added! Indexing will begin shortly.");
      handleOpenChange(false);
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  }

  const isFree = userPlan === "FREE" || userPlan === undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Enter a public GitHub repository URL to index it for AI analysis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="github-url" className="text-sm font-medium">
              GitHub Repository URL
            </label>
            <Input
              id="github-url"
              name="githubUrl"
              placeholder="https://github.com/facebook/react"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setValidationError(null);
                setApiError(null);
              }}
              autoComplete="off"
              aria-invalid={Boolean(validationError || apiError)}
            />
            {validationError ? (
              <p className="text-sm text-destructive">{validationError}</p>
            ) : null}
            {apiError ? (
              <p className="text-sm text-destructive">{apiError}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p>✓ Public repositories are supported</p>
            <p>✓ Private repos require a GitHub token (coming soon)</p>
            {isFree ? (
              <p className="font-medium text-foreground">
                ⚠ Free plan: 1 repository maximum. Upgrade for unlimited.
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addRepo.isPending}>
              {addRepo.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner
                    size="sm"
                    className="border-primary-foreground border-t-transparent"
                  />
                  Adding…
                </span>
              ) : (
                "Add Repository"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
