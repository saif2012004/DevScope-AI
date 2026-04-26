export type GithubRepoMetadata = {
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
};

type GithubApiRepo = {
  default_branch?: string;
  private?: boolean;
  description?: string | null;
  message?: string;
};

const INVALID_URL =
  "Invalid GitHub URL. Use format: https://github.com/owner/repo";

const GITHUB_URL_RE =
  /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;

export function parseGithubUrl(raw: string):
  | { ok: true; owner: string; repoName: string; normalizedUrl: string }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: INVALID_URL };
  }

  let url = trimmed.replace(/\/+$/, "");
  if (url.toLowerCase().endsWith(".git")) {
    url = url.slice(0, -4);
  }

  const match = url.match(GITHUB_URL_RE);
  const owner = match?.[1];
  const repoName = match?.[2];
  if (!owner || !repoName) {
    return { ok: false, error: INVALID_URL };
  }
  const normalizedUrl = `https://github.com/${owner}/${repoName}`;
  return { ok: true, owner, repoName, normalizedUrl };
}

export type FetchGithubRepoResult =
  | { ok: true; data: GithubRepoMetadata }
  | { ok: false; status: 404 | 403 | 503 | 500; message: string };

export async function fetchGithubRepoMetadata(
  owner: string,
  repoName: string,
): Promise<FetchGithubRepoResult> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DevScope-AI",
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(apiUrl, { headers });
  } catch {
    return {
      ok: false,
      status: 500,
      message: "Failed to reach GitHub. Try again later.",
    };
  }

  const remaining = response.headers.get("x-ratelimit-remaining");

  if (response.status === 404) {
    return {
      ok: false,
      status: 404,
      message:
        "Repository not found or is private. Make sure the URL is correct.",
    };
  }

  if (response.status === 403) {
    let body: GithubApiRepo | null = null;
    try {
      body = (await response.json()) as GithubApiRepo;
    } catch {
      body = null;
    }
    const msg = body?.message?.toLowerCase() ?? "";
    const rateLimited =
      remaining === "0" ||
      msg.includes("rate limit") ||
      msg.includes("api rate limit exceeded");

    if (rateLimited) {
      return {
        ok: false,
        status: 503,
        message: "GitHub rate limit reached. Please try again in a minute.",
      };
    }

    return {
      ok: false,
      status: 404,
      message:
        "Repository not found or is private. Make sure the URL is correct.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 500,
      message: "GitHub returned an unexpected error. Try again later.",
    };
  }

  let data: GithubApiRepo;
  try {
    data = (await response.json()) as GithubApiRepo;
  } catch {
    return {
      ok: false,
      status: 500,
      message: "Invalid response from GitHub.",
    };
  }

  return {
    ok: true,
    data: {
      defaultBranch: data.default_branch ?? "main",
      isPrivate: Boolean(data.private),
      description: data.description ?? null,
    },
  };
}
