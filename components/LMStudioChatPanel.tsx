"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLMStudioChat } from "@/lib/useLMStudioChat";
import { LMStudioResponse } from "./LMStudioResponse";
import { INITIAL_STREAM_STATE } from "@/lib/lmstudio-types";

export function LMStudioChatPanel() {
  const { messages, streamState, isStreaming, sendMessage, abort, clearMessages } =
    useLMStudioChat();
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  // Smart auto-scroll: only scroll when user is near the bottom
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (isNearBottom.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, streamState.reasoning, streamState.message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || isStreaming) return;
    setPrompt("");
    await sendMessage(text);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto space-y-4 p-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-[var(--muted)] text-sm py-12">
            Direct LM Studio chat. Messages go straight to the model.
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-[var(--accent)]/15 text-[var(--foreground)] border border-[var(--accent)]/25"
                  : "bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <LMStudioResponse
                  streamState={
                    msg.isStreaming
                      ? streamState
                      : {
                          ...INITIAL_STREAM_STATE,
                          phase: "complete",
                          reasoning: msg.reasoning || "",
                          message: msg.content,
                          toolCalls: msg.toolCalls || [],
                          stats: msg.stats || null,
                        }
                  }
                  reasoning={msg.reasoning || ""}
                  content={msg.content}
                  toolCalls={msg.toolCalls}
                  stats={msg.stats}
                  isStreaming={msg.isStreaming}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border)]">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Chat directly with LM Studio..."
          className="w-full rounded-lg bg-[var(--card-bg)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          rows={2}
          disabled={isStreaming}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <div className="flex gap-2 mt-2">
          {isStreaming ? (
            <button
              type="button"
              onClick={abort}
              className="flex-1 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white font-medium transition"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="flex-1 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition"
            >
              Send
            </button>
          )}
          {messages.length > 0 && !isStreaming && (
            <button
              type="button"
              onClick={clearMessages}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/30 text-sm transition"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
