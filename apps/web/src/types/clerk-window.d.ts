declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: (template?: string) => Promise<string | null>;
      };
    };
  }
}

export {};
