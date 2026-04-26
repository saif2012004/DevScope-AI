export type RepoStatus = "PENDING" | "INDEXING" | "INDEXED" | "FAILED";

export type Repo = {
  id: string;
  githubOwner: string;
  githubName: string;
  githubUrl: string;
  status: RepoStatus;
  totalFiles: number;
  totalChunks: number;
  indexedAt: string | null;
  createdAt: string;
};
