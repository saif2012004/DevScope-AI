"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Component } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (this.state.error) {
      const message =
        this.state.error.message || "An unexpected error occurred.";
      return (
        <div className="flex min-h-[40vh] items-center justify-center p-6">
          <Card className="max-w-lg border-destructive/30 shadow-lg">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Something went wrong</h2>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                {message}
              </pre>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto"
              >
                Reload page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
