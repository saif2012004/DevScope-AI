"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type UsagePayload = {
  plan: "FREE" | "PRO";
  messagesThisMonth: number;
  messagesLimit: number | null;
  repoCount: number;
  repoLimit: number | null;
  memberSince: string;
};

export function useUsage() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: async () => {
      const res = await api.get<UsagePayload>("/api/auth/usage");
      return res.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
