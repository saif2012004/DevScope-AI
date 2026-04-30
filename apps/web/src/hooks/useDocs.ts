"use client";

import axios from "axios";
import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type GeneratedDocRecord = {
  id: string;
  repoId: string;
  userId: string;
  content: string;
  tokensUsed: number;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DocProgress = {
  currentSection: string;
  sectionIndex: number;
  totalSections: number;
};

export function useDoc(repoId: string | null) {
  return useQuery({
    queryKey: ["doc", repoId],
    queryFn: async () => {
      try {
        const res = await api.get<GeneratedDocRecord>(`/api/docs/${repoId}`);
        return res.data;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!repoId,
    retry: false,
  });
}

export function useGenerateDoc() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<DocProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef("");
  const [previewContent, setPreviewContent] = useState("");

  const generate = useCallback(
    async (repoId: string) => {
      setIsGenerating(true);
      setError(null);
      setProgress(null);
      contentRef.current = "";
      setPreviewContent("");

      const baseURL =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

      let token: string | null | undefined;
      try {
        token = await window.Clerk?.session?.getToken();
      } catch {
        token = undefined;
      }

      let response: Response;
      try {
        response = await fetch(`${baseURL}/api/docs/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ repoId }),
        });
      } catch {
        setError("Could not reach server");
        setIsGenerating(false);
        return;
      }

      if (!response.ok) {
        let errMsg = "Request failed";
        try {
          const data = (await response.json()) as { error?: string };
          errMsg = data.error ?? errMsg;
        } catch {
          // ignore
        }
        setError(errMsg);
        setIsGenerating(false);
        return;
      }

      if (!response.body) {
        setError("No response body");
        setIsGenerating(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEventType = "";
      let currentData = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            currentData = line.slice(6);
          } else if (line === "") {
            // empty line fires the event
            if (currentData) {
              try {
                const data = JSON.parse(currentData) as Record<string, unknown>;

                if (currentEventType === "section_start") {
                  setProgress({
                    currentSection: data.title as string,
                    sectionIndex: data.sectionIndex as number,
                    totalSections: data.totalSections as number,
                  });
                } else if (currentEventType === "token") {
                  contentRef.current += data.token as string;
                } else if (currentEventType === "section_end") {
                  setPreviewContent(contentRef.current);
                } else if (currentEventType === "done") {
                  setIsGenerating(false);
                  setProgress(null);
                  setPreviewContent("");
                  void queryClient.invalidateQueries({
                    queryKey: ["doc", repoId],
                  });
                } else if (currentEventType === "error") {
                  setError(
                    (data.message as string | undefined) ?? "Unknown error",
                  );
                  setIsGenerating(false);
                }
              } catch {
                // ignore malformed JSON
              }
            }
            currentEventType = "";
            currentData = "";
          }
        }
      }

      // If we reach here without a done event, end gracefully
      setIsGenerating(false);
    },
    [queryClient],
  );

  return { isGenerating, progress, error, generate, previewContent };
}
