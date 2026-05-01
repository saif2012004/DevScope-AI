import { detectLanguage } from "../lib/fetchRepoFiles";
import type { PRFile } from "./prReviewer.service";

async function makeGitHubRequest<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DevScope-AI",
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub API error ${response.status} for ${url}: ${body.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<T>;
}

type GitHubPR = {
  number: number;
  title: string;
  body: string | null;
  user: { login: string };
  base: { ref: string };
  head: { ref: string };
  state: string;
  html_url: string;
};

type GitHubPRFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};

export async function getPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<GitHubPR> {
  return makeGitHubRequest<GitHubPR>(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
  );
}

export async function getPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRFile[]> {
  const files = await makeGitHubRequest<GitHubPRFile[]>(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
  );

  const validStatuses = ["added", "modified", "deleted", "renamed"] as const;
  type ValidStatus = (typeof validStatuses)[number];

  return files.map((f) => ({
    filename: f.filename,
    status: (
      validStatuses.includes(f.status as ValidStatus)
        ? f.status
        : "modified"
    ) as ValidStatus,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
    language: detectLanguage(f.filename),
  }));
}
