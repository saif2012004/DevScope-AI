"use client";

import { Send } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask a question about this codebase… (Enter to send, Shift+Enter for newline)",
  inputRef: externalRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = externalRef ?? internalRef;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value, ref]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        type="button"
        size="icon"
        disabled={disabled || !value.trim()}
        onClick={onSubmit}
        className="h-8 w-8 shrink-0"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
