"use client";

import { Bot, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import { Spinner } from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { useSetPageTitle } from "@/context/PageTitleContext";
import { useDeleteSession, useMessages, useSessions, useStreamQuery } from "@/hooks/useChat";
import { useRepos } from "@/hooks/useRepos";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

// Stable empty array — using `= []` inline as a React Query default creates a
// new reference every render, which would trigger the sync useEffect in a loop.
const NO_MESSAGES: ChatMessage[] = [];

// ── Inner component (uses useSearchParams) ──────────────────────────────────

function ChatPageInner() {
  useSetPageTitle("AI Chat");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Ctrl+K / Cmd+K focuses the chat input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { data: allRepos = [], isLoading: reposLoading } = useRepos();
  const indexedRepos = allRepos.filter((r) => r.status === "INDEXED");

  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialise repo from URL param
  useEffect(() => {
    if (indexedRepos.length === 0) return;
    const paramRepoId = searchParams.get("repoId");
    if (paramRepoId && indexedRepos.some((r) => r.id === paramRepoId)) {
      setSelectedRepoId(paramRepoId);
    } else if (!selectedRepoId) {
      setSelectedRepoId(indexedRepos[0]!.id);
    }
  }, [indexedRepos, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(
    selectedRepoId || undefined,
  );
  const deleteSession = useDeleteSession();

  const { data: savedMessages = NO_MESSAGES, isLoading: messagesLoading } =
    useMessages(activeSessionId);

  // Sync saved messages → display (only when not streaming).
  // Use the functional updater so React bails out (no re-render) when the
  // reference hasn't actually changed.
  useEffect(() => {
    if (!isStreaming) {
      setMessages((prev) => (prev === savedMessages ? prev : savedMessages));
    }
  }, [savedMessages, isStreaming]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const streamQuery = useStreamQuery();

  const handleSend = useCallback(async () => {
    const question = inputValue.trim();
    if (!question || !selectedRepoId || isStreaming) return;

    setInputValue("");
    setError(null);
    setIsStreaming(true);
    setStreamingContent("");

    const optimisticUser: ChatMessage = {
      id: `opt-${Date.now()}`,
      sessionId: activeSessionId ?? "",
      role: "USER",
      content: question,
      sourceCitations: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      await streamQuery({
        repoId: selectedRepoId,
        question,
        sessionId: activeSessionId ?? undefined,
        onToken: (token) => setStreamingContent((prev) => prev + token),
        onDone: (newSessionId) => {
          setActiveSessionId(newSessionId);
          setStreamingContent("");
          setIsStreaming(false);
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", newSessionId],
          });
          queryClient.invalidateQueries({
            queryKey: ["chat-sessions", selectedRepoId],
          });
        },
        onError: (msg) => {
          setError(msg);
          setIsStreaming(false);
          setStreamingContent("");
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticUser.id),
          );
        },
      });
    } catch {
      setError("Failed to connect to server");
      setIsStreaming(false);
      setStreamingContent("");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
    }
  }, [inputValue, selectedRepoId, activeSessionId, isStreaming, streamQuery, queryClient]);

  function handleNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setStreamingContent("");
    setError(null);
  }

  function handleSelectSession(sessionId: string) {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setStreamingContent("");
    setError(null);
  }

  function handleRepoChange(repoId: string) {
    setSelectedRepoId(repoId);
    setActiveSessionId(null);
    setMessages([]);
    setStreamingContent("");
    setError(null);
    router.push(`/dashboard/chat?repoId=${encodeURIComponent(repoId)}`, {
      scroll: false,
    });
  }

  const selectedRepo = indexedRepos.find((r) => r.id === selectedRepoId);

  // ── No indexed repos ────────────────────────────────────────────────────

  if (!reposLoading && indexedRepos.length === 0) {
    return (
      <div className="flex h-[calc(100svh-var(--header-height)-3rem)] items-center justify-center">
        <div className="text-center">
          <MessageSquare
            className="mx-auto mb-4 h-12 w-12 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
          <h3 className="text-lg font-semibold">No indexed repositories</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a GitHub repository and wait for it to be indexed.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/dashboard/repos")}
          >
            Go to Repositories
          </Button>
        </div>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100svh-var(--header-height)-4rem)] overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(263_85%_60%/0.15)]">
      {/* ── Sidebar ── */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-background/40">
        {/* Repo selector */}
        <div className="border-b border-border/60 p-3">
          <label
            htmlFor="repo-select"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            Repository
          </label>
          <select
            id="repo-select"
            value={selectedRepoId}
            onChange={(e) => handleRepoChange(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-card/80 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(263_85%_60%/0.4)]"
          >
            {indexedRepos.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.githubOwner}/{repo.githubName}
              </option>
            ))}
          </select>
        </div>

        {/* New chat */}
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4" aria-hidden />
            New chat
          </Button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessionsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((session) => (
                <li key={session.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                      activeSessionId === session.id
                        ? "border border-[hsl(263_85%_60%/0.3)] bg-[hsl(263_85%_60%/0.12)] text-foreground"
                        : "border border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                    )}
                    onClick={() => handleSelectSession(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelectSession(session.id);
                    }}
                  >
                    <MessageSquare
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-xs">
                      {session.title}
                    </span>
                    <button
                      type="button"
                      aria-label="Delete conversation"
                      className="shrink-0 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession.mutate(session.id, {
                          onSuccess: () => {
                            if (activeSessionId === session.id) handleNewChat();
                          },
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-background/30 px-4 py-3 backdrop-blur-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(263_85%_60%/0.15)]">
            <Bot className="h-3.5 w-3.5 text-[hsl(263_85%_75%)]" aria-hidden />
          </div>
          <span className="text-sm font-medium">
            {selectedRepo
              ? `${selectedRepo.githubOwner}/${selectedRepo.githubName}`
              : "AI Chat"}
          </span>
          {selectedRepo && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full border border-border/60 bg-white/[0.02] px-2.5 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {selectedRepo.totalChunks.toLocaleString()} chunks indexed
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messagesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 -m-3 animate-pulse rounded-full bg-[hsl(263_85%_60%/0.15)] blur-xl" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[hsl(263_85%_60%/0.3)] bg-[hsl(263_85%_60%/0.12)] backdrop-blur">
                  <Bot
                    className="h-7 w-7 text-[hsl(263_85%_75%)]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </div>
              </div>
              <h3 className="text-lg font-semibold">Ask anything about this codebase</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                I have access to{" "}
                <span className="font-medium text-foreground">
                  {selectedRepo?.totalChunks.toLocaleString() ?? "—"}
                </span>{" "}
                code chunks and can explain logic, trace call flows, and find patterns.
              </p>
              <div className="mt-6 grid w-full max-w-md gap-2 text-left">
                {[
                  "What does this codebase do?",
                  "Explain the main architecture",
                  "How is authentication handled?",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="group rounded-xl border border-border/60 bg-card/40 px-3.5 py-2.5 text-left text-sm text-muted-foreground backdrop-blur transition-all hover:border-[hsl(263_85%_60%/0.4)] hover:bg-[hsl(263_85%_60%/0.08)] hover:text-foreground hover:shadow-[0_8px_30px_-12px_hsl(263_85%_60%/0.4)]"
                    onClick={() => setInputValue(q)}
                  >
                    <span className="mr-2 text-[hsl(263_85%_75%)] opacity-60 group-hover:opacity-100">›</span>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && <StreamingBubble content={streamingContent} />}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border/60 bg-background/30 p-4 backdrop-blur-sm">
          {!selectedRepoId ? (
            <p className="text-center text-sm text-muted-foreground">
              Select a repository above to start chatting
            </p>
          ) : (
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              disabled={isStreaming || !selectedRepoId}
              inputRef={inputRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page export (Suspense boundary for useSearchParams) ─────────────────────

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100svh-var(--header-height)-3rem)] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
