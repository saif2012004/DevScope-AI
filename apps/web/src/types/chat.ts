export type MessageRole = "USER" | "ASSISTANT";

export type SourceCitation = {
  path: string;
  language: string;
  startLine: number;
  endLine: number;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  sourceCitations: SourceCitation[] | null;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  repoId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};
