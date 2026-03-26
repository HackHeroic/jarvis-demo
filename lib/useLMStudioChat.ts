/**
 * Custom hook for LM Studio direct streaming chat.
 * Manages conversation history, streaming lifecycle, and abort.
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { lmstudioChatStream } from "./lmstudio-api";
import type {
  LMStudioMessage,
  LMStudioStreamState,
  LMStudioStreamPhase,
  ToolCallEntry,
  LMSChatEndStats,
  INITIAL_STREAM_STATE,
} from "./lmstudio-types";

const INITIAL_STATE: LMStudioStreamState = {
  phase: "idle",
  modelLoadProgress: 0,
  promptProcessProgress: 0,
  reasoning: "",
  message: "",
  toolCalls: [],
  stats: null,
  error: null,
  reasoningDurationMs: null,
};

export function useLMStudioChat() {
  const [messages, setMessages] = useState<LMStudioMessage[]>([]);
  const [streamState, setStreamState] = useState<LMStudioStreamState>(INITIAL_STATE);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const streamingMsg = useRef<LMStudioMessage | null>(null);
  const reasoningStartTime = useRef<number | null>(null);

  const updatePhase = useCallback((phase: LMStudioStreamPhase) => {
    setStreamState((s) => ({ ...s, phase }));
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    // Finalize partial message
    if (streamingMsg.current) {
      streamingMsg.current.isStreaming = false;
      const final = { ...streamingMsg.current };
      setMessages((m) => [...m.slice(0, -1), final]);
      streamingMsg.current = null;
    }

    setStreamState((s) => ({ ...s, phase: "aborted" }));
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string, options?: { model?: string; temperature?: number }) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: LMStudioMessage = {
        role: "user",
        content: content.trim(),
        isStreaming: false,
      };

      // Build conversation history for LM Studio (all previous messages + new user message)
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Add user message and placeholder assistant message
      const assistantMsg: LMStudioMessage = {
        role: "assistant",
        content: "",
        reasoning: "",
        toolCalls: [],
        isStreaming: true,
      };
      streamingMsg.current = assistantMsg;

      setMessages((m) => [...m, userMsg, assistantMsg]);
      setStreamState({ ...INITIAL_STATE, phase: "connecting" });
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      await lmstudioChatStream(
        conversationHistory,
        {
          onChatStart: () => updatePhase("connecting"),

          onModelLoadStart: () => updatePhase("model_loading"),
          onModelLoadProgress: (progress) => {
            setStreamState((s) => ({ ...s, phase: "model_loading", modelLoadProgress: progress }));
          },
          onModelLoadEnd: () => {
            setStreamState((s) => ({ ...s, modelLoadProgress: 1 }));
          },

          onPromptProcessStart: () => updatePhase("prompt_processing"),
          onPromptProcessProgress: (progress) => {
            setStreamState((s) => ({ ...s, phase: "prompt_processing", promptProcessProgress: progress }));
          },
          onPromptProcessEnd: () => {
            setStreamState((s) => ({ ...s, promptProcessProgress: 1 }));
          },

          onReasoningStart: () => {
            reasoningStartTime.current = Date.now();
            updatePhase("reasoning");
          },
          onReasoningDelta: (token) => {
            if (!streamingMsg.current) return;
            streamingMsg.current.reasoning = (streamingMsg.current.reasoning || "") + token;
            setStreamState((s) => ({ ...s, phase: "reasoning", reasoning: s.reasoning + token }));
            setMessages((m) => {
              const updated = { ...streamingMsg.current! };
              return [...m.slice(0, -1), updated];
            });
          },
          onReasoningEnd: () => {
            const duration = reasoningStartTime.current
              ? Date.now() - reasoningStartTime.current
              : null;
            setStreamState((s) => ({ ...s, reasoningDurationMs: duration }));
            reasoningStartTime.current = null;
          },

          onToolCallStart: (data) => {
            const entry: ToolCallEntry = { tool: data.tool, status: "running" };
            if (streamingMsg.current) {
              streamingMsg.current.toolCalls = [...(streamingMsg.current.toolCalls || []), entry];
            }
            setStreamState((s) => ({
              ...s,
              phase: "tool_calling",
              toolCalls: [...s.toolCalls, entry],
            }));
          },
          onToolCallArguments: (data) => {
            setStreamState((s) => {
              const calls = [...s.toolCalls];
              const last = calls.findLast((c) => c.tool === data.tool);
              if (last) last.arguments = data.arguments;
              return { ...s, toolCalls: calls };
            });
          },
          onToolCallSuccess: (data) => {
            setStreamState((s) => {
              const calls = [...s.toolCalls];
              const last = calls.findLast((c) => c.tool === data.tool);
              if (last) {
                last.status = "success";
                last.output = data.output;
              }
              return { ...s, toolCalls: calls };
            });
          },
          onToolCallFailure: (data) => {
            setStreamState((s) => {
              const calls = [...s.toolCalls];
              const last = calls[calls.length - 1];
              if (last) {
                last.status = "failure";
                last.failureReason = data.reason;
              }
              return { ...s, toolCalls: calls };
            });
          },

          onMessageStart: () => updatePhase("responding"),
          onMessageDelta: (token) => {
            if (!streamingMsg.current) return;
            streamingMsg.current.content += token;
            setStreamState((s) => ({ ...s, phase: "responding", message: s.message + token }));
            setMessages((m) => {
              const updated = { ...streamingMsg.current! };
              return [...m.slice(0, -1), updated];
            });
          },
          onMessageEnd: () => {},

          onChatEnd: (data) => {
            const stats = data.result?.stats || null;
            if (streamingMsg.current) {
              streamingMsg.current.isStreaming = false;
              streamingMsg.current.stats = stats as LMSChatEndStats | undefined;
              streamingMsg.current.toolCalls = streamState.toolCalls.length
                ? [...streamState.toolCalls]
                : streamingMsg.current.toolCalls;
              const final = { ...streamingMsg.current };
              setMessages((m) => [...m.slice(0, -1), final]);
              streamingMsg.current = null;
            }
            setStreamState((s) => ({ ...s, phase: "complete", stats: stats as LMSChatEndStats | null }));
            setIsStreaming(false);
            abortRef.current = null;
          },

          onError: (err) => {
            const errorMsg = "message" in err ? (err as { message: string }).message : String(err);
            if (streamingMsg.current) {
              streamingMsg.current.isStreaming = false;
              if (!streamingMsg.current.content) {
                streamingMsg.current.content = `Error: ${errorMsg}`;
              }
              const final = { ...streamingMsg.current };
              setMessages((m) => [...m.slice(0, -1), final]);
              streamingMsg.current = null;
            }
            setStreamState((s) => ({ ...s, phase: "error", error: errorMsg }));
            setIsStreaming(false);
            abortRef.current = null;
          },
        },
        {
          model: options?.model,
          temperature: options?.temperature,
          signal: controller.signal,
        }
      );
    },
    [isStreaming, messages, streamState.toolCalls, updatePhase]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamState(INITIAL_STATE);
  }, []);

  return { messages, streamState, isStreaming, sendMessage, abort, clearMessages };
}
