"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Repo } from "@/types/repo";

export function useRepos() {
  return useQuery({
    queryKey: ["repos"],
    queryFn: async () => {
      const res = await api.get<Repo[]>("/api/repos");
      return res.data;
    },
  });
}

export function useAddRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (githubUrl: string) => {
      const res = await api.post<Repo>("/api/repos", { githubUrl });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
    },
  });
}

export function useDeleteRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (repoId: string) => {
      await api.delete(`/api/repos/${repoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
    },
  });
}
