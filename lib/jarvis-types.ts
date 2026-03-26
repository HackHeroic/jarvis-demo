/**
 * TypeScript types for Jarvis unified streaming chat.
 * Supports both pipeline phase events and Voice of Jarvis token streaming.
 */

import type { ChatResponse } from "./demoData";

// --- Streaming phases (data-driven from backend) ---

export type JarvisStreamPhase =
  // Pipeline phases (emitted by backend progress_callback)
  | "idle"
  | "connecting"
  | "brain_dump_extraction"
  | "intent_classified"
  | "habits_saved"
  | "habits_fetched"
  | "habits_translated"
  | "plan_day_start"
  | "decomposing"
  | "decomposition_done"
  | "scheduling"
  | "schedule_done"
  | "synthesizing"
  // Task confirmation phases
  | "awaiting_confirmation"
  | "confirming"
  // Voice of Jarvis streaming phases
  | "reasoning"
  | "responding"
  // Terminal phases
  | "complete"
  | "error"
  | "aborted";

// --- Phase event data (dynamic from backend) ---

export interface PhaseEventData {
  phase: string;
  [key: string]: unknown;
}

// --- Stream state ---

export interface JarvisStreamState {
  phase: JarvisStreamPhase;
  reasoning: string;
  message: string;
  error: string | null;
  reasoningDurationMs: number | null;
  // Pipeline phase data — dynamic from backend, not hardcoded
  intent: string | null;
  phaseHistory: PhaseEventData[];
  currentPhaseData: PhaseEventData | null;
  // Model info — which model is active for current phase
  activeModel: string | null;
  modelMode: string | null;
}

export const INITIAL_STREAM_STATE: JarvisStreamState = {
  phase: "idle",
  reasoning: "",
  message: "",
  error: null,
  reasoningDurationMs: null,
  intent: null,
  phaseHistory: [],
  currentPhaseData: null,
  activeModel: null,
  modelMode: null,
};

// --- Message model for chat history ---

export interface JarvisMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  reasoningDurationMs?: number | null;
  phaseHistory?: PhaseEventData[];
  response?: ChatResponse;
  isStreaming: boolean;
  fileName?: string;
  mediaType?: string;
  conversation_id?: string;
  message_id?: string;
}

export interface ChatResponseSessionFields {
  conversation_id?: string;
  message_id?: string;
  suggested_action?: string;
  clarification_options?: string[];
}
