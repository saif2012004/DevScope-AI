"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { api } from "@/lib/api";
import type { ChatMessage, ChatSession } from "@/types/chat";

export function useSessions(repoId?: string) {
  return useQuery({
    queryKey: ["chat-sessions", repoId ?? null],
    queryFn: async () => {
      const res = await api.get<ChatSession[]>("/api/chat/sessions", {
        params: repoId ? { repoId } : undefined,
      });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: async () => {
      const res = await api.get<ChatMessage[]>(
        `/api/chat/sessions/${sessionId}/messages`,
      );
      return res.data;
    },
    enabled: !!sessionId,
    staleTime: 0,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/api/chat/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });
}

type StreamQueryParams = {
  repoId: string;
  question: string;
  sessionId?: string;
  onToken: (token: string) => void;
  onDone: (sessionId: string, messageId: string) => void;
  onError: (message: string) => void;
};

export function useStreamQuery() {
  return useCallback(async ({
    repoId,
    question,
    sessionId,
    onToken,
    onDone,
    onError,
  }: StreamQueryParams) => {
    let token: string | null | undefined;
    try {
      token = await window.Clerk?.session?.getToken();
    } catch {
      token = undefined;
    }

    const baseURL =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

    let response: Response;
    try {
      response = await fetch(`${baseURL}/api/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ repoId, question, sessionId }),
      });
    } catch {
      onError("Could not reach server");
      return;
    }

    if (!response.ok) {
      let errMsg = "Request failed";
      try {
        const data = (await response.json()) as { error?: string };
        errMsg = data.error ?? errMsg;
      } catch {
        //
      }
      onError(errMsg);
      return;
    }

    if (!response.body) {
      onError("No response body");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
          if (event.type === "token") {
            onToken(event.content as string);
          } else if (event.type === "done") {
            onDone(event.sessionId as string, event.messageId as string);
          } else if (event.type === "error") {
            onError((event.message as string | undefined) ?? "Unknown error");
          }
        } catch {
          //
        }
      }
    }
  }, []);
}
