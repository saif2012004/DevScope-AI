const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  ".nyc_output",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  "target",
  "bin",
  "obj",
  ".cache",
  ".parcel-cache",
  "storybook-static",
  ".turbo",
]);

const INCLUDED_EXTENSIONS = new Set([
  // TypeScript / JavaScript
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  // Python
  ".py",
  // Ruby
  ".rb",
  // Go
  ".go",
  // Rust
  ".rs",
  // Java / Kotlin
  ".java", ".kt",
  // Swift
  ".swift",
  // C / C++
  ".c", ".cpp", ".h", ".hpp",
  // C#
  ".cs",
  // PHP
  ".php",
  // Scala
  ".scala",
  // Elixir
  ".ex", ".exs",
  // Haskell
  ".hs",
  // Lua
  ".lua",
  // Shell
  ".sh", ".bash", ".zsh",
  // Data / Config
  ".json", ".yaml", ".yml", ".toml", ".xml",
  // Database
  ".sql", ".prisma",
  // Web
  ".html", ".css", ".scss", ".sass", ".less",
  // GraphQL
  ".graphql", ".gql",
  // Docs
  ".md", ".mdx",
  // Infrastructure
  ".tf", ".tfvars",
]);

const MAX_FILES_PER_REPO = 500;
const MAX_FILE_SIZE_BYTES = 500_000; // 500 KB
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;

export type FileRecord = {
  path: string;
  content: string;
  language: string;
  size: number;
};

export type FetchRepoResult = {
  owner: string;
  repoName: string;
  defaultBranch: string;
  description: string | null;
  isPrivate: boolean;
  files: FileRecord[];
  totalFilesFound: number;
  totalFilesFetched: number;
};

const EXT_TO_LANGUAGE: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript (React)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (React)",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rb": "Ruby",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".swift": "Swift",
  ".c": "C",
  ".cpp": "C++",
  ".h": "C/C++ Header",
  ".hpp": "C++ Header",
  ".cs": "C#",
  ".php": "PHP",
  ".scala": "Scala",
  ".ex": "Elixir",
  ".exs": "Elixir Script",
  ".hs": "Haskell",
  ".lua": "Lua",
  ".sh": "Shell",
  ".bash": "Bash",
  ".zsh": "Zsh",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".xml": "XML",
  ".sql": "SQL",
  ".prisma": "Prisma",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "Sass",
  ".less": "Less",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
  ".md": "Markdown",
  ".mdx": "MDX",
  ".tf": "Terraform",
  ".tfvars": "Terraform Variables",
};

export function detectLanguage(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return "Unknown";
  const ext = filePath.slice(lastDot).toLowerCase();
  return EXT_TO_LANGUAGE[ext] ?? "Unknown";
}

type GitHubTreeItem = {
  path?: string;
  type?: string;
  size?: number;
  sha?: string;
};

type GitHubTreeResponse = {
  tree?: GitHubTreeItem[];
  truncated?: boolean;
};

type GitHubRepoResponse = {
  default_branch?: string;
  private?: boolean;
  description?: string | null;
};

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
      `GitHub API error ${response.status} for ${url}: ${body.slice(0, 200)}`
    );
  }

  return response.json() as Promise<T>;
}

function isExcluded(filePath: string): boolean {
  const parts = filePath.split("/");
  return parts.some((part) => EXCLUDED_DIRS.has(part));
}

function hasIncludedExtension(filePath: string): boolean {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return false;
  const ext = filePath.slice(lastDot).toLowerCase();
  return INCLUDED_EXTENSIONS.has(ext);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRepoFiles(
  owner: string,
  repoName: string,
  defaultBranch: string
): Promise<FetchRepoResult> {
  // Step 1: Fetch repo metadata
  const repoMeta = await makeGitHubRequest<GitHubRepoResponse>(
    `https://api.github.com/repos/${owner}/${repoName}`
  );

  const branch = defaultBranch || repoMeta.default_branch || "main";

  // Step 2: Fetch full recursive file tree
  const tree = await makeGitHubRequest<GitHubTreeResponse>(
    `https://api.github.com/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`
  );

  if (!tree.tree) {
    throw new Error("GitHub returned an empty file tree");
  }

  // Step 3: Filter blobs by excluded dirs, extension, size, and repo limit
  const eligible = tree.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.path &&
      !isExcluded(item.path) &&
      hasIncludedExtension(item.path) &&
      (item.size ?? 0) > 0 &&
      (item.size ?? 0) <= MAX_FILE_SIZE_BYTES
  );

  const totalFilesFound = eligible.length;
  const filesToFetch = eligible.slice(0, MAX_FILES_PER_REPO);

  // Step 4: Fetch raw content in batches of 10 with 200ms delay between batches
  const files: FileRecord[] = [];

  for (let i = 0; i < filesToFetch.length; i += BATCH_SIZE) {
    const batch = filesToFetch.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${item.path}`;
        const response = await fetch(rawUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${item.path}: HTTP ${response.status}`);
        }
        const content = await response.text();
        return {
          path: item.path!,
          content,
          language: detectLanguage(item.path!),
          size: item.size ?? content.length,
        } satisfies FileRecord;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        files.push(result.value);
      } else {
        console.warn("[fetchRepoFiles] skipped file:", result.reason);
      }
    }

    if (i + BATCH_SIZE < filesToFetch.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // Step 5: Return result
  return {
    owner,
    repoName,
    defaultBranch: branch,
    description: repoMeta.description ?? null,
    isPrivate: Boolean(repoMeta.private),
    files,
    totalFilesFound,
    totalFilesFetched: files.length,
  };
}
