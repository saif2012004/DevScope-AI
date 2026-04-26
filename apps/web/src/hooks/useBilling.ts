"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type BillingStatus = {
  plan: "FREE" | "PRO";
  subscriptionStatus: string;
  stripeSubscriptionId: string | null;
};

export function useBillingStatus() {
  return useQuery({
    queryKey: ["billing"],
    queryFn: async () => {
      const res = await api.get<BillingStatus>(
        "/api/billing/subscription-status",
      );
      return res.data;
    },
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ url: string }>(
        "/api/billing/create-checkout-session",
      );
      return res.data.url;
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ url: string }>(
        "/api/billing/create-portal-session",
      );
      return res.data.url;
    },
  });
}
