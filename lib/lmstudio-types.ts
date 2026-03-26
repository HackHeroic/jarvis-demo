/**
 * TypeScript types for LM Studio native streaming API events.
 * Matches the SSE event model from https://lmstudio.ai/docs/developer/rest/streaming-events
 */

// --- Individual SSE event data payloads ---

export interface LMSChatStart {
  model_instance_id: string;
}

export interface LMSModelLoadProgress {
  progress: number; // 0–1
}

export interface LMSModelLoadEnd {
  load_time_seconds: number;
}

export interface LMSPromptProcessingProgress {
  progress: number; // 0–1
}

export interface LMSReasoningDelta {
  content: string;
}

export interface LMSToolCallStart {
  tool: string;
  provider_info?: unknown;
}

export interface LMSToolCallArguments {
  tool: string;
  arguments: unknown;
  provider_info?: unknown;
}

export interface LMSToolCallSuccess {
  tool: string;
  arguments: unknown;
  output: string;
  provider_info?: unknown;
}

export interface LMSToolCallFailure {
  reason: string;
  metadata?: { type?: "invalid_name" | "invalid_arguments" };
}

export interface LMSMessageDelta {
  content: string;
}

export interface LMSError {
  type: string;
  message: string;
  code?: string;
  param?: string;
}

export interface LMSChatEndStats {
  input_tokens: number;
  total_output_tokens: number;
  tokens_per_second: number;
  time_to_first_token_seconds: number;
}

export interface LMSChatEnd {
  result: {
    model_instance_id: string;
    output: unknown[];
    stats: LMSChatEndStats;
    response_id: string;
  };
}

// --- Streaming state ---

export type LMStudioStreamPhase =
  | "idle"
  | "connecting"
  | "model_loading"
  | "prompt_processing"
  | "reasoning"
  | "tool_calling"
  | "responding"
  | "complete"
  | "error"
  | "aborted";

export interface ToolCallEntry {
  tool: string;
  arguments?: unknown;
  output?: string;
  status: "running" | "success" | "failure";
  failureReason?: string;
}

export interface LMStudioStreamState {
  phase: LMStudioStreamPhase;
  modelLoadProgress: number;
  promptProcessProgress: number;
  reasoning: string;
  message: string;
  toolCalls: ToolCallEntry[];
  stats: LMSChatEndStats | null;
  error: string | null;
  reasoningDurationMs: number | null;
}

export const INITIAL_STREAM_STATE: LMStudioStreamState = {
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

// --- Message model for chat history ---

export interface LMStudioMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  toolCalls?: ToolCallEntry[];
  stats?: LMSChatEndStats;
  isStreaming: boolean;
}
