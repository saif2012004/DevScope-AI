"use client";

import { ChevronDown, ChevronUp, FileCode } from "lucide-react";
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
        <ul className="mt-2 space-y-1">
          {citations.map((c, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="truncate font-mono">{c.path}</span>
              <span className="shrink-0 opacity-60">
                L{c.startLine}–{c.endLine}
              </span>
            </li>
          ))}
        </ul>
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
  "[&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_blockquote]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_a]:text-brand [&_a]:underline",
  "[&_hr]:my-2 [&_hr]:border-border",
  "[&_table]:my-2 [&_table]:w-full [&_table]:text-xs",
  "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
].join(" ");

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground",
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
    </div>
  );
}

export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-foreground">
        {content ? (
          <div className={mdClass}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center gap-1" aria-label="Thinking">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  );
}
