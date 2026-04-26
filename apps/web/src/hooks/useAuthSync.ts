"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export function useAuthSync() {
  const { userId, getToken, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const queryClient = useQueryClient();
  const ranRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  useEffect(() => {
    if (!authLoaded || !userLoaded || !userId || !user || ranRef.current) {
      return;
    }

    ranRef.current = true;
    let cancelled = false;

    (async () => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const email =
          user.primaryEmailAddress?.emailAddress ??
          user.emailAddresses[0]?.emailAddress ??
          "";
        await getToken();
        const res = await api.post("/api/auth/sync", {
          clerkId: userId,
          email,
          name: user.fullName ?? user.firstName ?? null,
          avatarUrl: user.imageUrl ?? null,
        });
        if (!cancelled) {
          queryClient.setQueryData(["currentUser"], res.data);
        }
      } catch (e) {
        if (!cancelled) {
          setSyncError(e instanceof Error ? e : new Error("Sync failed"));
        }
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, userLoaded, userId, user, getToken, queryClient]);

  return { isSyncing, syncError };
}
