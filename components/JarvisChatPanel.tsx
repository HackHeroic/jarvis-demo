"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useJarvisChat, type UseJarvisChatReturn } from "@/lib/useJarvisChat";
import { JarvisResponse } from "./JarvisResponse";
import { TaskPreview } from "./TaskPreview";
import { INITIAL_STREAM_STATE } from "@/lib/jarvis-types";
import { saveLastChatResponse } from "@/lib/scheduleStore";

interface JarvisChatPanelProps {
  fileBase64?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  onClearFile?: () => void;
  /** Optional: pass lifted hook values from parent to share state with SessionSidebar */
  chat?: UseJarvisChatReturn;
}

const MODEL_MODES = [
  { value: "auto", label: "Auto", description: "4B classifies intent, 27B reasons and decomposes" },
  { value: "4b", label: "4B SLM", description: "Fast classification only" },
  { value: "27b", label: "27B", description: "Direct 27B — bypasses pipeline, full reasoning" },
] as const;

function formatModelName(model: string): string {
  // "openai/mlx-community/qwen3.5-27b" → "qwen3.5-27b"
  const parts = model.split("/");
  return parts[parts.length - 1];
}

export function JarvisChatPanel({ fileBase64, mediaType, fileName, onClearFile, chat: externalChat }: JarvisChatPanelProps) {
  // Always call the internal hook (React rules), but prefer external if provided
  const internalChat = useJarvisChat();
  const {
    messages, streamState, isStreaming, sendMessage, abort, clearMessages,
    pendingTasks, pendingGoalMetadata, confirmTasks, cancelConfirmation,
    draftScheduleResponse, acceptDraft, acceptState, rejectDraft,
    triggerReplan, isReplanning,
  } = externalChat ?? internalChat;
  const [prompt, setPrompt] = useState("");
  const [modelMode, setModelMode] = useState<"auto" | "4b" | "27b">("auto");
  const [sentWithFile, setSentWithFile] = useState(false);
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
  }, [messages, streamState.reasoning, streamState.message, streamState.phase]);

  // Save schedule to store when response has one (skip drafts — they're saved separately)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && !lastMsg.isStreaming && lastMsg.response?.schedule && lastMsg.response?.schedule_status !== "draft") {
      saveLastChatResponse(lastMsg.response);
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || isStreaming) return;
    setPrompt("");
    const hadFile = !!fileBase64;
    if (hadFile) setSentWithFile(true);
    await sendMessage(text, {
      fileBase64: fileBase64 || undefined,
      mediaType: mediaType || undefined,
      modelMode,
      fileName: fileName || undefined,
    });
    // Clear file after sending
    if (hadFile && onClearFile) onClearFile();
    setSentWithFile(false);
    inputRef.current?.focus();
  };

  // Active model display during streaming
  const activeModelDisplay = streamState.activeModel
    ? formatModelName(streamState.activeModel)
    : null;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Model selector bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-1">
          {MODEL_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setModelMode(mode.value)}
              disabled={isStreaming}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                modelMode === mode.value
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/30"
              } disabled:opacity-50`}
              title={mode.description}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {/* Active model indicator */}
        {isStreaming && activeModelDisplay && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] font-mono">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            {modelMode === "auto"
              ? `4B → 27B pipeline (${activeModelDisplay})`
              : activeModelDisplay}
          </div>
        )}
        {!isStreaming && (
          <span className="text-[10px] text-[var(--muted)] font-mono">
            {modelMode === "auto" ? "4B → 27B pipeline" :
             modelMode === "27b" ? "Direct 27B (no pipeline)" :
             "4B only"}
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto space-y-4 p-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-[var(--muted)] text-sm py-12">
            Your AI productivity assistant. Send a brain dump, set habits, or upload documents.
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
                <div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.fileName && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--accent)]/80">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span>{msg.fileName}</span>
                      {msg.mediaType && (
                        <span className="text-[9px] font-mono opacity-60">{msg.mediaType.toUpperCase()}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <JarvisResponse
                  streamState={
                    msg.isStreaming
                      ? streamState
                      : {
                          ...INITIAL_STREAM_STATE,
                          phase: "complete",
                          reasoning: msg.reasoning || "",
                          message: msg.content,
                          intent: msg.response?.intent || null,
                          reasoningDurationMs: msg.reasoningDurationMs ?? null,
                          phaseHistory: msg.phaseHistory || [],
                        }
                  }
                  reasoning={msg.reasoning || ""}
                  content={msg.content}
                  response={msg.response}
                  isStreaming={msg.isStreaming}
                  onAcceptSchedule={msg.response?.schedule_status === "draft" ? acceptDraft : undefined}
                  onSuggestChanges={msg.response?.schedule_status === "draft" ? (text: string) => {
                    if (text) {
                      // Direct suggest from ScheduleSection inline input
                      sendMessage(text, { modelMode });
                    } else {
                      inputRef.current?.focus();
                      setPrompt("Change ");
                    }
                  } : undefined}
                  onClarificationSelect={(option) => sendMessage(option, { modelMode })}
                  onReplan={triggerReplan}
                  isReplanning={isReplanning}
                  acceptState={msg.response?.schedule_status === "draft" ? acceptState : undefined}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task confirmation preview */}
      {pendingTasks && pendingTasks.length > 0 && (
        <div className="px-4 pb-2">
          <TaskPreview
            tasks={pendingTasks}
            goalMetadata={pendingGoalMetadata as { objective?: string; goal_id?: string } | undefined}
            onConfirm={(editedTasks, gm) => confirmTasks(editedTasks, gm)}
            onCancel={cancelConfirmation}
            onRegenerate={() => {
              cancelConfirmation();
              const lastUserMsg = messages.filter(m => m.role === "user").pop();
              if (lastUserMsg) {
                sendMessage(lastUserMsg.content, { modelMode });
              }
            }}
            isScheduling={streamState.phase === "confirming"}
          />
        </div>
      )}

      {/* Draft schedule active hint */}
      {!isStreaming && draftScheduleResponse && !pendingTasks && (
        <div className="px-4 pb-1">
          <span className="text-xs text-amber-400/70">
            Draft schedule active — type a modification (e.g. &quot;make first task longer&quot;) or accept above.
          </span>
        </div>
      )}

      {/* Document processing indicator during streaming */}
      {isStreaming && sentWithFile && (
        <div className="px-4 pb-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] animate-pulse">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing document...
          </span>
        </div>
      )}

      {/* File attachment indicator */}
      {fileBase64 && (
        <div className="px-4 pb-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded px-2 py-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {fileName || "File attached"}
            {mediaType && (
              <span className="text-[9px] font-mono text-[var(--muted)] bg-[var(--card-bg)] rounded px-1">
                {mediaType.toUpperCase()}
              </span>
            )}
            {onClearFile && (
              <button
                type="button"
                onClick={onClearFile}
                className="text-[var(--muted)] hover:text-red-400 ml-1"
              >
                {"\u2715"}
              </button>
            )}
          </span>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border)]">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Plan my day, set habits, upload a syllabus..."
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
