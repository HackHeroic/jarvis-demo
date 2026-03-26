"use client";

import { useState, useRef } from "react";
import { chatForTask } from "@/lib/api";
import type { ChatResponse } from "@/lib/api";
import type { TaskChatContext } from "@/lib/api";
import { ThinkingProcess } from "./ThinkingProcess";
import { cn } from "@/lib/utils";

interface WorkspaceChatPanelProps {
  context: TaskChatContext;
}

export function WorkspaceChatPanel({ context }: WorkspaceChatPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; response?: ChatResponse }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const userMsg = prompt.trim();
    setPrompt("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await chatForTask(context, userMsg);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.message, response: res },
      ]);
    } catch (err) {
      console.error("[WorkspaceChatPanel] chat failed:", err);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Error: ${String(err)}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[320px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)]/50">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Ask about this task
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Get help with concepts, examples, or materials
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0"
      >
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)] italic">
            Ask a question about &quot;{context.taskTitle}&quot; or any of the
            materials above.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--border)]/30 text-[var(--foreground)]"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.response?.thinking_process && (
                <ThinkingProcess text={msg.response.thinking_process} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-sm bg-[var(--border)]/30 text-[var(--muted)]">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-[var(--border)] bg-[var(--card-bg)]/30"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Explain universal vs existential quantifiers"
          className={cn(
            "w-full rounded-lg px-3 py-2 text-sm resize-none",
            "border border-[var(--border)] bg-[var(--card-bg)]",
            "text-[var(--foreground)] placeholder-[var(--muted)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          )}
          rows={2}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className={cn(
            "mt-2 w-full py-2 rounded-lg text-sm font-medium",
            "bg-[var(--accent)] text-white",
            "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-opacity"
          )}
        >
          Send
        </button>
      </form>
    </div>
  );
}
