"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { registerQueryClient } from "@/lib/queryClientBridge";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
        mutations: {
          onError: (err) => {
            console.error("[mutation error]", err);
          },
        },
      },
    });
    registerQueryClient(client);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
