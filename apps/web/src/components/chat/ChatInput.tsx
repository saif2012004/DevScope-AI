"use client";

import { Send, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { type KeyboardEvent, useEffect, useRef } from "react";

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask a question about this codebase…",
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

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="group relative">
      {/* Focus glow ring */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
        style={{
          background:
            "linear-gradient(120deg, hsl(263 85% 60% / 0.5), hsl(199 89% 60% / 0.35), hsl(263 85% 60% / 0.5))",
          filter: "blur(8px)",
        }}
        aria-hidden
      />
      <div className="relative flex items-end gap-2 rounded-2xl border border-border/80 bg-card/80 px-4 py-3 backdrop-blur-xl transition-colors group-focus-within:border-[hsl(263_85%_60%/0.5)]">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <motion.button
          type="button"
          disabled={!canSend}
          onClick={onSubmit}
          whileHover={canSend ? { scale: 1.05 } : undefined}
          whileTap={canSend ? { scale: 0.92 } : undefined}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[hsl(263_85%_65%)] to-[hsl(263_85%_50%)] text-white shadow-[0_6px_20px_-8px_hsl(263_85%_60%/0.7)] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {disabled ? (
            <Sparkles className="h-4 w-4 animate-pulse" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </motion.button>
      </div>
      <p className="mt-2 px-1 text-[11px] text-muted-foreground/70">
        <kbd className="rounded border border-border/60 bg-background/50 px-1 py-0.5 text-[10px]">Enter</kbd> to send ·{" "}
        <kbd className="rounded border border-border/60 bg-background/50 px-1 py-0.5 text-[10px]">Shift+Enter</kbd> for newline
      </p>
    </div>
  );
}
