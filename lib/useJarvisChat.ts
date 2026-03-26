/**
 * Custom hook for Jarvis unified streaming chat.
 * Uses the Jarvis pipeline (POST /api/v1/chat/stream) with granular phase events,
 * Voice of Jarvis thinking/message streaming, abort support, and full ChatResponse.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { chatStream, confirmScheduleStream, acceptSchedule } from "./api";
import type { ChatResponse } from "./demoData";
import { saveChatMessages, loadChatMessages, clearChatMessages, saveDraftSchedule, loadDraftSchedule, clearDraftSchedule, promoteDraftToFinal } from "./scheduleStore";
import type {
  JarvisMessage,
  JarvisStreamState,
  JarvisStreamPhase,
  PhaseEventData,
  INITIAL_STREAM_STATE as _,
} from "./jarvis-types";
import type { PreviewTask } from "@/components/TaskPreview";

const INITIAL_STATE: JarvisStreamState = {
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

export type UseJarvisChatReturn = {
  messages: JarvisMessage[];
  streamState: JarvisStreamState;
  isStreaming: boolean;
  sendMessage: (content: string, options?: { fileBase64?: string; mediaType?: string; modelMode?: string; fileName?: string }) => Promise<void>;
  abort: () => void;
  clearMessages: () => void;
  pendingTasks: import("@/components/TaskPreview").PreviewTask[] | null;
  pendingGoalMetadata: Record<string, unknown> | null;
  confirmTasks: (editedTasks: import("@/components/TaskPreview").PreviewTask[], goalMetadata?: Record<string, unknown>) => Promise<void>;
  cancelConfirmation: () => void;
  draftScheduleResponse: import("./demoData").ChatResponse | null;
  acceptDraft: () => Promise<void>;
  acceptState: "idle" | "accepting" | "accepted";
  rejectDraft: () => void;
  conversationId: string | null;
  startNewConversation: () => void;
  loadConversation: (sessionId: string) => Promise<void>;
  triggerReplan: () => Promise<void>;
  isReplanning: boolean;
};

export function useJarvisChat(): UseJarvisChatReturn {
  const [messages, setMessages] = useState<JarvisMessage[]>(() => loadChatMessages());
  const [streamState, setStreamState] = useState<JarvisStreamState>(INITIAL_STATE);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<PreviewTask[] | null>(null);
  const [pendingGoalMetadata, setPendingGoalMetadata] = useState<Record<string, unknown> | null>(null);
  const [draftScheduleResponse, setDraftScheduleResponse] = useState<ChatResponse | null>(() => loadDraftSchedule());
  const [acceptState, setAcceptState] = useState<"idle" | "accepting" | "accepted">("idle");
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jarvis-conversation-id");
    }
    return null;
  });
  const [isReplanning, setIsReplanning] = useState(false);

  // Persist non-streaming messages to localStorage
  useEffect(() => {
    const nonStreaming = messages.filter((m) => !m.isStreaming);
    if (nonStreaming.length > 0) {
      saveChatMessages(nonStreaming);
    }
  }, [messages]);

  const abortRef = useRef<AbortController | null>(null);
  const streamingMsg = useRef<JarvisMessage | null>(null);
  const reasoningStartTime = useRef<number | null>(null);
  const reasoningDurationRef = useRef<number | null>(null);
  const phaseHistoryRef = useRef<PhaseEventData[]>([]);

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
    async (
      content: string,
      options?: { fileBase64?: string; mediaType?: string; modelMode?: string; fileName?: string },
    ) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: JarvisMessage = {
        role: "user",
        content: content.trim(),
        isStreaming: false,
        fileName: options?.fileName,
        mediaType: options?.mediaType,
      };

      // Placeholder assistant message
      const assistantMsg: JarvisMessage = {
        role: "assistant",
        content: "",
        reasoning: "",
        isStreaming: true,
      };
      streamingMsg.current = assistantMsg;

      setMessages((m) => [...m, userMsg, assistantMsg]);
      setStreamState({ ...INITIAL_STATE, phase: "connecting" });
      setIsStreaming(true);
      reasoningDurationRef.current = null;
      phaseHistoryRef.current = [];

      const controller = new AbortController();
      abortRef.current = controller;

      // Build draft_schedule context if we have an active draft
      const draftContext = draftScheduleResponse ? {
        schedule: draftScheduleResponse.schedule,
        execution_graph: draftScheduleResponse.execution_graph,
        horizon_start: draftScheduleResponse.schedule?.horizon_start,
      } : undefined;

      await chatStream(
        {
          user_prompt: content.trim(),
          user_id: "demo",
          file_base64: options?.fileBase64,
          media_type: options?.mediaType,
          file_name: options?.fileName,
          model_mode: (options?.modelMode as "auto" | "4b" | "27b") || "auto",
          conversation_id: conversationId || undefined,
          ...(draftContext ? { draft_schedule: draftContext } : {}),
        },
        {
          onPhase: (phase, data) => {
            const phaseEvent: PhaseEventData = { phase, ...data };
            const intent = (data.intent as string) || null;
            const activeModel = (data.model as string) || null;
            const modelMode = (data.model_mode as string) || null;
            phaseHistoryRef.current = [...phaseHistoryRef.current, phaseEvent];
            setStreamState((s) => ({
              ...s,
              phase: phase as JarvisStreamPhase,
              intent: intent || s.intent,
              activeModel: activeModel || s.activeModel,
              modelMode: modelMode || s.modelMode,
              currentPhaseData: phaseEvent,
              phaseHistory: [...s.phaseHistory, phaseEvent],
            }));
          },

          onStep: (intent, data) => {
            setStreamState((s) => ({
              ...s,
              phase: "synthesizing",
              intent,
              activeModel: (data?.synthesis_model as string) || s.activeModel,
              modelMode: (data?.model_mode as string) || s.modelMode,
            }));
          },

          onThinkingToken: (token) => {
            if (!streamingMsg.current) return;
            if (!reasoningStartTime.current) {
              reasoningStartTime.current = Date.now();
            }
            streamingMsg.current.reasoning = (streamingMsg.current.reasoning || "") + token;
            setStreamState((s) => ({
              ...s,
              phase: "reasoning",
              reasoning: s.reasoning + token,
            }));
            setMessages((m) => {
              const updated = { ...streamingMsg.current! };
              return [...m.slice(0, -1), updated];
            });
          },

          onMessageToken: (token) => {
            if (!streamingMsg.current) return;
            // Record reasoning duration on first message token
            if (reasoningStartTime.current) {
              const duration = Date.now() - reasoningStartTime.current;
              reasoningDurationRef.current = duration;
              setStreamState((s) => ({ ...s, reasoningDurationMs: duration }));
              reasoningStartTime.current = null;
            }
            streamingMsg.current.content += token;
            setStreamState((s) => ({
              ...s,
              phase: "responding",
              message: s.message + token,
            }));
            setMessages((m) => {
              const updated = { ...streamingMsg.current! };
              return [...m.slice(0, -1), updated];
            });
          },

          onComplete: (response: ChatResponse) => {
            if (streamingMsg.current) {
              streamingMsg.current.isStreaming = false;
              streamingMsg.current.response = response;
              if (response.conversation_id) {
                setConversationId(response.conversation_id);
                localStorage.setItem("jarvis-conversation-id", response.conversation_id);
                if (streamingMsg.current) {
                  streamingMsg.current.conversation_id = response.conversation_id;
                  streamingMsg.current.message_id = response.message_id;
                }
              }
              // Use streamed content if available, else fall back
              if (!streamingMsg.current.content.trim()) {
                streamingMsg.current.content = response.message || "Done.";
              }
              if (!streamingMsg.current.reasoning?.trim() && response.thinking_process) {
                streamingMsg.current.reasoning = response.thinking_process;
              }
              // Persist reasoning duration so completed messages show "Thought for Xs"
              streamingMsg.current.reasoningDurationMs = reasoningDurationRef.current;
              // Persist pipeline trace so it survives after streaming ends
              streamingMsg.current.phaseHistory = [...phaseHistoryRef.current];
              const final = { ...streamingMsg.current };
              setMessages((m) => [...m.slice(0, -1), final]);
              streamingMsg.current = null;
            }

            // Check if pipeline is paused for task confirmation
            if (response.awaiting_task_confirmation && response.execution_graph?.decomposition) {
              setPendingTasks(
                response.execution_graph.decomposition.map((t) => ({
                  task_id: t.task_id,
                  title: t.title,
                  duration_minutes: t.duration_minutes,
                  difficulty_weight: t.difficulty_weight,
                  completion_criteria: t.completion_criteria,
                  implementation_intention: t.implementation_intention,
                }))
              );
              setPendingGoalMetadata(
                (response.execution_graph.goal_metadata as Record<string, unknown>) || null
              );
              setStreamState((s) => ({ ...s, phase: "awaiting_confirmation" }));
              setIsStreaming(false);
              abortRef.current = null;
              return;
            }

            // Draft schedule: store in draft state, don't save as final
            if (response.schedule_status === "draft" && response.schedule) {
              setDraftScheduleResponse(response);
              saveDraftSchedule(response);
            }

            setStreamState((s) => ({ ...s, phase: "complete" }));
            setIsStreaming(false);
            abortRef.current = null;
          },

          onError: (err) => {
            const errorMsg = err.message || String(err);
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
        { signal: controller.signal },
      );
    },
    [isStreaming, conversationId, draftScheduleResponse],
  );

  const confirmTasks = useCallback(
    async (editedTasks: PreviewTask[], goalMetadata?: Record<string, unknown>) => {
      setStreamState((s) => ({ ...s, phase: "confirming" }));
      setIsStreaming(true);
      setPendingTasks(null);

      // Create a new assistant message for the schedule response
      const assistantMsg: JarvisMessage = {
        role: "assistant",
        content: "",
        reasoning: "",
        isStreaming: true,
      };
      streamingMsg.current = assistantMsg;
      setMessages((m) => [...m, assistantMsg]);

      const controller = new AbortController();
      abortRef.current = controller;

      await confirmScheduleStream(
        {
          user_id: "demo",
          tasks: editedTasks.map((t) => ({
            task_id: t.task_id,
            title: t.title,
            duration_minutes: t.duration_minutes,
            difficulty_weight: t.difficulty_weight,
            completion_criteria: t.completion_criteria,
            implementation_intention: t.implementation_intention,
            dependencies: t.dependencies || [],
          })),
          goal_metadata: goalMetadata,
        },
        {
          onPhase: (phase, data) => {
            const phaseEvent: PhaseEventData = { phase, ...data };
            const activeModel = (data.model as string) || null;
            const modelMode = (data.model_mode as string) || null;
            setStreamState((s) => ({
              ...s,
              phase: phase as JarvisStreamPhase,
              activeModel: activeModel || s.activeModel,
              modelMode: modelMode || s.modelMode,
              currentPhaseData: phaseEvent,
              phaseHistory: [...s.phaseHistory, phaseEvent],
            }));
          },

          onStep: (intent, data) => {
            setStreamState((s) => ({
              ...s,
              phase: "synthesizing",
              intent,
              activeModel: (data?.synthesis_model as string) || s.activeModel,
              modelMode: (data?.model_mode as string) || s.modelMode,
            }));
          },

          onThinkingToken: (token) => {
            if (!streamingMsg.current) return;
            if (!reasoningStartTime.current) {
              reasoningStartTime.current = Date.now();
            }
            streamingMsg.current.reasoning = (streamingMsg.current.reasoning || "") + token;
            setStreamState((s) => ({
              ...s,
              phase: "reasoning",
              reasoning: s.reasoning + token,
            }));
            setMessages((m) => {
              const updated = { ...streamingMsg.current! };
              return [...m.slice(0, -1), updated];
            });
          },

          onMessageToken: (token) => {
            if (!streamingMsg.current) return;
            if (reasoningStartTime.current) {
              const duration = Date.now() - reasoningStartTime.current;
              setStreamState((s) => ({ ...s, reasoningDurationMs: duration }));
              reasoningStartTime.current = null;
            }
            streamingMsg.current.content += token;
            setStreamState((s) => ({
              ...s,
              phase: "responding",
              message: s.message + token,
            }));
            setMessages((m) => {
              const updated = { ...streamingMsg.current! };
              return [...m.slice(0, -1), updated];
            });
          },

          onComplete: (response: ChatResponse) => {
            if (streamingMsg.current) {
              streamingMsg.current.isStreaming = false;
              streamingMsg.current.response = response;
              if (!streamingMsg.current.content.trim()) {
                streamingMsg.current.content = response.message || "Done.";
              }
              if (!streamingMsg.current.reasoning?.trim() && response.thinking_process) {
                streamingMsg.current.reasoning = response.thinking_process;
              }
              const final = { ...streamingMsg.current };
              setMessages((m) => [...m.slice(0, -1), final]);
              streamingMsg.current = null;
            }
            setStreamState((s) => ({ ...s, phase: "complete" }));
            setIsStreaming(false);
            abortRef.current = null;
          },

          onError: (err) => {
            const errorMsg = err.message || String(err);
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
        { signal: controller.signal },
      );
    },
    [],
  );

  const cancelConfirmation = useCallback(() => {
    setPendingTasks(null);
    setPendingGoalMetadata(null);
    setStreamState((s) => ({ ...s, phase: "complete" }));
  }, []);

  const acceptDraft = useCallback(async () => {
    if (!draftScheduleResponse) return;
    setAcceptState("accepting");
    try {
      const tasks = draftScheduleResponse.execution_graph?.decomposition || [];
      await acceptSchedule({
        user_id: "demo",
        tasks: tasks.map((t) => ({
          task_id: t.task_id,
          title: t.title,
          duration_minutes: t.duration_minutes,
          difficulty_weight: t.difficulty_weight,
          dependencies: (t as Record<string, unknown>).dependencies || [],
          completion_criteria: t.completion_criteria,
          implementation_intention: t.implementation_intention,
        })),
        goal_metadata: (draftScheduleResponse.execution_graph?.goal_metadata as Record<string, unknown>) || undefined,
      });
      promoteDraftToFinal(draftScheduleResponse);
      setAcceptState("accepted");
      setTimeout(() => {
        setDraftScheduleResponse(null);
        setAcceptState("idle");
      }, 2000);
    } catch {
      setAcceptState("idle");
    }
  }, [draftScheduleResponse]);

  const rejectDraft = useCallback(() => {
    clearDraftSchedule();
    setDraftScheduleResponse(null);
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    localStorage.removeItem("jarvis-conversation-id");
    setMessages([]);
    clearChatMessages();
    setDraftScheduleResponse(null);
    clearDraftSchedule();
    setPendingTasks(null);
  }, []);

  const loadConversation = useCallback(async (sessionId: string) => {
    setConversationId(sessionId);
    localStorage.setItem("jarvis-conversation-id", sessionId);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const resp = await fetch(
        `${baseUrl}/api/v1/sessions/${sessionId}?user_id=demo`
      );
      if (resp.ok) {
        const data = await resp.json();
        const loaded: JarvisMessage[] = (data.messages || []).map(
          (m: { id: string; role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            isStreaming: false,
            conversation_id: sessionId,
            message_id: m.id,
          })
        );
        setMessages(loaded);
        saveChatMessages(loaded);
        // Clear draft state when switching conversations
        setDraftScheduleResponse(null);
        clearDraftSchedule();
        setPendingTasks(null);
      }
    } catch {
      // Graceful degradation
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamState(INITIAL_STATE);
    setPendingTasks(null);
    setPendingGoalMetadata(null);
    clearChatMessages();
    clearDraftSchedule();
    setDraftScheduleResponse(null);
  }, []);

  const triggerReplan = useCallback(async () => {
    const lastPlanMsg = [...messages].reverse().find(
      (m) => m.role === "assistant" && m.response?.intent === "PLAN_DAY"
    );
    const lastUserGoal = [...messages].reverse().find(
      (m) => m.role === "user"
    );

    const replanPrompt = lastPlanMsg?.response?.execution_graph?.goal_metadata?.objective
      ? `Replan: ${lastPlanMsg.response.execution_graph.goal_metadata.objective}`
      : lastUserGoal?.content || "Replan my schedule with updated preferences";

    setIsReplanning(true);
    try {
      await sendMessage(replanPrompt);
    } finally {
      setIsReplanning(false);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    streamState,
    isStreaming,
    sendMessage,
    abort,
    clearMessages,
    pendingTasks,
    pendingGoalMetadata,
    confirmTasks,
    cancelConfirmation,
    draftScheduleResponse,
    acceptDraft,
    acceptState,
    rejectDraft,
    conversationId,
    startNewConversation,
    loadConversation,
    triggerReplan,
    isReplanning,
  };
}
