"use client";

import { ChevronDown, ChevronUp, FileCode, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import type { ChatMessage, SourceCitation } from "@/types/chat";

function Citations({ citations }: { citations: SourceCitation[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <FileCode className="h-3.5 w-3.5" aria-hidden />
        {citations.length} source{citations.length !== 1 ? "s" : ""}
        {open ? (
          <ChevronUp className="h-3 w-3" aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden />
        )}
      </button>
      {open && (
        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 space-y-1 overflow-hidden"
        >
          {citations.map((c, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md bg-white/[0.03] px-2 py-1 text-xs text-muted-foreground"
            >
              <FileCode className="h-3 w-3 shrink-0 text-[hsl(263_85%_75%)]" aria-hidden />
              <span className="truncate font-mono">{c.path}</span>
              <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] opacity-80">
                L{c.startLine}–{c.endLine}
              </span>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

const mdClass = [
  "[&_p]:my-1.5 [&_p]:leading-relaxed",
  "[&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-bold",
  "[&_h2]:mb-1.5 [&_h2]:mt-2.5 [&_h2]:text-base [&_h2]:font-semibold",
  "[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5",
  "[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[hsl(263_85%_80%)]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-white/10",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground",
  "[&_blockquote]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-[hsl(263_85%_60%)] [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_a]:text-[hsl(263_85%_75%)] [&_a]:underline",
  "[&_hr]:my-2 [&_hr]:border-border",
  "[&_table]:my-2 [&_table]:w-full [&_table]:text-xs",
  "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
].join(" ");

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "USER";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[hsl(263_85%_60%/0.3)] bg-[hsl(263_85%_60%/0.12)]">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(263_85%_75%)]" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "rounded-br-md bg-gradient-to-br from-[hsl(263_85%_60%/0.25)] to-[hsl(263_85%_60%/0.15)] text-white shadow-[0_4px_20px_-8px_hsl(263_85%_60%/0.5)] ring-1 ring-[hsl(263_85%_60%/0.35)]"
            : "rounded-bl-md border border-white/10 bg-white/[0.03] text-foreground backdrop-blur",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className={mdClass}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser &&
          message.sourceCitations &&
          message.sourceCitations.length > 0 && (
            <Citations citations={message.sourceCitations} />
          )}
      </div>
    </motion.div>
  );
}

export function StreamingBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[hsl(263_85%_60%/0.4)] bg-[hsl(263_85%_60%/0.15)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="h-3.5 w-3.5 text-[hsl(263_85%_75%)]" />
        </motion.div>
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground backdrop-blur">
        {content ? (
          <div className={mdClass}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[hsl(263_85%_70%)]" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5" aria-label="Thinking">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(263_85%_70%)] [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(263_85%_70%)] [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(263_85%_70%)] [animation-delay:300ms]" />
            <span className="ml-1 text-xs text-muted-foreground">Thinking…</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
