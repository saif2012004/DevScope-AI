"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PageTitleContextValue = {
  title: string;
  setTitle: (title: string) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState("Dashboard");
  const setTitle = useCallback((next: string) => {
    setTitleState(next);
  }, []);
  const value = useMemo(
    () => ({ title, setTitle }),
    [title, setTitle],
  );
  return (
    <PageTitleContext.Provider value={value}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  const ctx = useContext(PageTitleContext);
  if (!ctx) {
    throw new Error("usePageTitle must be used within PageTitleProvider");
  }
  return ctx;
}

export function useSetPageTitle(title: string) {
  const { setTitle } = usePageTitle();
  useEffect(() => {
    setTitle(title);
  }, [title, setTitle]);
}
