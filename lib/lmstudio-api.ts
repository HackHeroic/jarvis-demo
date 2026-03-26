/**
 * LM Studio native streaming API client.
 * Parses SSE events from POST /api/v1/lmstudio/stream (FastAPI proxy).
 */

import type {
  LMSChatStart,
  LMSChatEnd,
  LMSError,
  LMSToolCallStart,
  LMSToolCallArguments,
  LMSToolCallSuccess,
  LMSToolCallFailure,
} from "./lmstudio-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface LMStudioStreamHandlers {
  onChatStart?: (data: LMSChatStart) => void;
  onModelLoadStart?: () => void;
  onModelLoadProgress?: (progress: number) => void;
  onModelLoadEnd?: (loadTimeSeconds: number) => void;
  onPromptProcessStart?: () => void;
  onPromptProcessProgress?: (progress: number) => void;
  onPromptProcessEnd?: () => void;
  onReasoningStart?: () => void;
  onReasoningDelta?: (content: string) => void;
  onReasoningEnd?: () => void;
  onToolCallStart?: (data: LMSToolCallStart) => void;
  onToolCallArguments?: (data: LMSToolCallArguments) => void;
  onToolCallSuccess?: (data: LMSToolCallSuccess) => void;
  onToolCallFailure?: (data: LMSToolCallFailure) => void;
  onMessageStart?: () => void;
  onMessageDelta?: (content: string) => void;
  onMessageEnd?: () => void;
  onChatEnd?: (data: LMSChatEnd) => void;
  onError?: (error: LMSError | Error) => void;
}

export interface LMStudioStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  reasoning?: "off" | "low" | "medium" | "high" | "on";
  signal?: AbortSignal;
}

/**
 * Stream a chat request through the LM Studio native proxy.
 * Handles chunked SSE delivery where event/data lines may arrive split across network chunks.
 */
export async function lmstudioChatStream(
  messages: Array<{ role: string; content: string }>,
  handlers: LMStudioStreamHandlers,
  options?: LMStudioStreamOptions
): Promise<void> {
  const body: Record<string, unknown> = { messages };
  if (options?.model) body.model = options.model;
  if (options?.temperature !== undefined) body.temperature = options.temperature;
  if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;
  if (options?.reasoning) body.reasoning = options.reasoning;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/lmstudio/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    handlers.onError?.(new Error(`Network error: ${String(e)}`));
    return;
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    handlers.onError?.(new Error(`Stream failed (${res.status}): ${text}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let currentEvent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Split into lines, keeping incomplete last line in buffer
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("event:")) {
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith("data:")) {
          const rawData = trimmed.slice(5).trim();
          if (!rawData || !currentEvent) continue;

          let data: Record<string, unknown>;
          try {
            data = JSON.parse(rawData);
          } catch {
            continue; // malformed JSON, skip
          }

          dispatchEvent(currentEvent, data, handlers);
          currentEvent = "";
        }
        // blank lines (SSE separators) reset event context
        else if (trimmed === "") {
          currentEvent = "";
        }
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    handlers.onError?.(new Error(`Stream read error: ${String(e)}`));
  }
}

/** Route an SSE event to the appropriate handler. */
function dispatchEvent(
  eventType: string,
  data: Record<string, unknown>,
  handlers: LMStudioStreamHandlers
): void {
  switch (eventType) {
    case "chat.start":
      handlers.onChatStart?.(data as unknown as LMSChatStart);
      break;
    case "model_load.start":
      handlers.onModelLoadStart?.();
      break;
    case "model_load.progress":
      handlers.onModelLoadProgress?.(data.progress as number);
      break;
    case "model_load.end":
      handlers.onModelLoadEnd?.(data.load_time_seconds as number);
      break;
    case "prompt_processing.start":
      handlers.onPromptProcessStart?.();
      break;
    case "prompt_processing.progress":
      handlers.onPromptProcessProgress?.(data.progress as number);
      break;
    case "prompt_processing.end":
      handlers.onPromptProcessEnd?.();
      break;
    case "reasoning.start":
      handlers.onReasoningStart?.();
      break;
    case "reasoning.delta":
      handlers.onReasoningDelta?.(data.content as string);
      break;
    case "reasoning.end":
      handlers.onReasoningEnd?.();
      break;
    case "tool_call.start":
      handlers.onToolCallStart?.(data as unknown as LMSToolCallStart);
      break;
    case "tool_call.arguments":
      handlers.onToolCallArguments?.(data as unknown as LMSToolCallArguments);
      break;
    case "tool_call.success":
      handlers.onToolCallSuccess?.(data as unknown as LMSToolCallSuccess);
      break;
    case "tool_call.failure":
      handlers.onToolCallFailure?.(data as unknown as LMSToolCallFailure);
      break;
    case "message.start":
      handlers.onMessageStart?.();
      break;
    case "message.delta":
      handlers.onMessageDelta?.(data.content as string);
      break;
    case "message.end":
      handlers.onMessageEnd?.();
      break;
    case "chat.end":
      handlers.onChatEnd?.(data as unknown as LMSChatEnd);
      break;
    case "error":
      handlers.onError?.(data as unknown as LMSError);
      break;
  }
}
