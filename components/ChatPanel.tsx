"use client";

import { useState, useRef } from "react";
import { chatStream } from "@/lib/api";
import type { ChatResponse } from "@/lib/api";
import { ResponseLayers } from "./ResponseLayers";
import { saveLastChatResponse } from "@/lib/scheduleStore";

interface ChatPanelProps {
  fileBase64?: string | null;
  mediaType?: string | null;
  onClearFile?: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking: string;
  isStreaming: boolean;
  response?: ChatResponse;
}

export function ChatPanel({ fileBase64, mediaType, onClearFile }: ChatPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingMsg = useRef<Message | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const userMsg = prompt.trim();
    setPrompt("");
    setMessages((m) => [...m, { role: "user", content: userMsg, thinking: "", isStreaming: false }]);
    setLoading(true);

    await chatStream(
      {
        user_prompt: userMsg,
        user_id: "demo",
        file_base64: fileBase64 || undefined,
        media_type: mediaType || undefined,
      },
      {
        onStep: (intent) => {
          const msg: Message = { role: "assistant", content: "", thinking: "", isStreaming: true };
          streamingMsg.current = msg;
          setMessages((m) => [...m, msg]);
        },
        onThinkingToken: (token) => {
          if (!streamingMsg.current) return;
          streamingMsg.current.thinking += token;
          setMessages((m) => {
            const updated = { ...streamingMsg.current! };
            return [...m.slice(0, -1), updated];
          });
        },
        onMessageToken: (token) => {
          if (!streamingMsg.current) return;
          streamingMsg.current.content += token;
          setMessages((m) => {
            const updated = { ...streamingMsg.current! };
            return [...m.slice(0, -1), updated];
          });
        },
        onComplete: (response) => {
          if (streamingMsg.current) {
            streamingMsg.current.isStreaming = false;
            streamingMsg.current.response = response;
            // Use streamed content if we have it, otherwise fall back to response fields
            if (!streamingMsg.current.content.trim()) {
              streamingMsg.current.content = response.message || "Done.";
            }
            if (!streamingMsg.current.thinking.trim() && response.thinking_process) {
              streamingMsg.current.thinking = response.thinking_process;
            }
            const final = { ...streamingMsg.current };
            if (response.schedule) saveLastChatResponse(response);
            setMessages((m) => [...m.slice(0, -1), final]);
          }
          setLoading(false);
          inputRef.current?.focus();
          streamingMsg.current = null;
        },
        onError: (err) => {
          console.error("[ChatPanel] stream error:", err);
          const errMsg: Message = {
            role: "assistant",
            content: `Error: ${String(err)}. Complex goals can take 1–2 minutes—check your connection and try again.`,
            thinking: "",
            isStreaming: false,
          };
          setMessages((m) => {
            // Replace streaming placeholder if it exists
            if (streamingMsg.current) {
              streamingMsg.current = null;
              return [...m.slice(0, -1), errMsg];
            }
            return [...m, errMsg];
          });
          setLoading(false);
          inputRef.current?.focus();
          streamingMsg.current = null;
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-800 text-slate-100"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <ResponseLayers
                  content={msg.content}
                  thinking={msg.thinking}
                  response={msg.response}
                  isStreaming={msg.isStreaming}
                  animate={i === messages.length - 1 && !loading && !msg.isStreaming}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Plan my day to study for math mid-sem..."
          className="w-full rounded-lg bg-slate-800 border border-slate-600 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          rows={2}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="mt-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition"
        >
          {loading ? "Thinking…" : "Send"}
        </button>
      </form>
    </div>
  );
}
