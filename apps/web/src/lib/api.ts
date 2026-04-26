import axios from "axios";
import { toast } from "sonner";

import { getRegisteredQueryClient } from "@/lib/queryClientBridge";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") {
    return config;
  }

  let token: string | null | undefined;
  try {
    token = await window.Clerk?.session?.getToken();
  } catch {
    token = undefined;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    if (!axios.isAxiosError(error) || !error.response) {
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401) {
      getRegisteredQueryClient()?.clear();
      const path = window.location.pathname;
      if (!path.startsWith("/sign-in") && !path.startsWith("/sign-up")) {
        window.location.href = "/sign-in";
      }
      return Promise.reject(error);
    }

    if (
      status === 403 &&
      data &&
      typeof data === "object" &&
      "upgradeRequired" in data &&
      (data as { upgradeRequired?: boolean }).upgradeRequired === true
    ) {
      toast.error("This action requires a Pro plan.", {
        action: {
          label: "Upgrade",
          onClick: () => {
            window.location.href = "/dashboard/billing";
          },
        },
      });
      return Promise.reject(error);
    }

    if (status >= 500) {
      toast.error("Server error. Please try again.");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);
