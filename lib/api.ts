/**
 * API client for Jarvis backend.
 * In Demo Mode, returns mock data from demoData.ts.
 * In Live Mode, calls the real Jarvis-Engine API.
 */

import type { ChatResponse } from "./demoData";
import {
  getMockChatResponse,
  getMockTaskChatResponse,
  getMockWorkspaceForTask,
  MOCK_CHAT_RESPONSE_PLAN_DAY,
  MOCK_WORKSPACE,
  type TaskWorkspace,
} from "./demoData";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEMO_MODE_KEY = "jarvis-demo-mode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false; // SSR: default to live
  return localStorage.getItem(DEMO_MODE_KEY) === "demo";
}

export function setDemoMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_MODE_KEY, enabled ? "demo" : "live");
}

/** Simulate network latency for demo mode (ms). */
const DEMO_LATENCY = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { ChatResponse } from "./demoData";

/** Context passed to task-scoped chat for RAG / grounded answers. */
export interface TaskChatContext {
  taskTitle: string;
  primaryObjective: string;
  surfacedAssets: Array<{ title: string; content_or_url: string }>;
}

export type ModelMode = "auto" | "4b" | "27b";

export interface ChatRequest {
  user_prompt: string;
  user_id: string;
  file_base64?: string;
  media_type?: string;
  file_name?: string;
  task_id?: string;
  task_context?: string;
  model_mode?: ModelMode;
  confirm_before_schedule?: boolean;
  draft_schedule?: Record<string, unknown>;
  conversation_id?: string;  // Session ID for multi-turn context
}

export interface ConfirmScheduleRequest {
  user_id: string;
  tasks: Array<Record<string, unknown>>;
  goal_metadata?: Record<string, unknown>;
  day_start_hour?: number;
  deadline_override?: string;
  max_daily_deep_work_minutes?: number;
  min_daily_deep_work_minutes?: number;
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  if (isDemoMode()) {
    await delay(DEMO_LATENCY);
    return getMockChatResponse(request.user_prompt, !!request.file_base64);
  }

  const res = await fetch(`${API_BASE}/api/v1/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || json.message || text;
    } catch {
      // use raw text
    }
    throw new Error(`Chat failed (${res.status}): ${detail}`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error("Received invalid response from server.");
  }
}

/** Task-scoped chat: answers questions about the current task and its materials. */
export async function chatForTask(
  context: TaskChatContext,
  userPrompt: string,
  userId: string = "demo"
): Promise<ChatResponse> {
  if (isDemoMode()) {
    await delay(DEMO_LATENCY);
    return getMockTaskChatResponse(context.taskTitle, context.primaryObjective, userPrompt);
  }

  const contextBlock = `[Task: ${context.taskTitle}. Objective: ${context.primaryObjective}. Surfaced materials: ${context.surfacedAssets.map((a) => `${a.title}: ${a.content_or_url.slice(0, 80)}...`).join("; ")}]`;
  const augmentedPrompt = `${contextBlock}\n\nUser question: ${userPrompt}`;
  return chat({ user_prompt: augmentedPrompt, user_id: userId });
}

export async function getWorkspace(
  taskId: string,
  userId: string,
  prompt?: string
): Promise<TaskWorkspace> {
  if (isDemoMode()) {
    await delay(DEMO_LATENCY);
    return { ...MOCK_WORKSPACE, task_id: taskId };
  }

  const params = new URLSearchParams({ user_id: userId });
  if (prompt) params.set("prompt", prompt);
  const res = await fetch(
    `${API_BASE}/api/v1/tasks/${taskId}/workspace?${params}`
  );
  if (!res.ok) throw new Error(`Workspace failed: ${res.status}`);
  return res.json();
}

export function getScheduleFromChatResponse(
  response: ChatResponse
): typeof MOCK_CHAT_RESPONSE_PLAN_DAY.schedule | null {
  return response.schedule ?? null;
}

export function getExecutionGraphFromChatResponse(
  response: ChatResponse
): ChatResponse["execution_graph"] {
  return response.execution_graph ?? undefined;
}

export interface StreamHandlers {
  onStep?: (intent: string, data?: Record<string, unknown>) => void;
  onPhase?: (phase: string, data: Record<string, unknown>) => void;
  onThinkingToken?: (token: string) => void;
  onMessageToken?: (token: string) => void;
  onComplete?: (response: ChatResponse) => void;
  onError?: (err: Error) => void;
}

export interface StreamOptions {
  signal?: AbortSignal;
}

async function simulateDemoStream(
  request: ChatRequest,
  handlers: StreamHandlers
): Promise<void> {
  const full = getMockChatResponse(request.user_prompt, !!request.file_base64);
  handlers.onStep?.(full.intent);
  await delay(300);
  if (full.thinking_process) {
    const words = full.thinking_process.split(" ");
    for (const word of words) {
      await delay(25);
      handlers.onThinkingToken?.(word + " ");
    }
  }
  await delay(100);
  const msgWords = full.message.split(" ");
  for (const word of msgWords) {
    await delay(35);
    handlers.onMessageToken?.(word + " ");
  }
  await delay(200);
  handlers.onComplete?.(full);
}

export async function chatStream(
  request: ChatRequest,
  handlers: StreamHandlers,
  options?: StreamOptions,
): Promise<void> {
  if (isDemoMode()) {
    await simulateDemoStream(request, handlers);
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
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
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === "phase") {
              const { phase, ...rest } = data;
              handlers.onPhase?.(phase as string, rest);
            } else if (currentEvent === "step") {
              handlers.onStep?.(data.intent, data);
            } else if (currentEvent === "thinking") {
              handlers.onThinkingToken?.(data.token);
            } else if (currentEvent === "message") {
              handlers.onMessageToken?.(data.token);
            } else if (currentEvent === "complete") {
              handlers.onComplete?.(data as ChatResponse);
            } else if (currentEvent === "error") {
              handlers.onError?.(new Error(data.error || "Stream error"));
            }
          } catch {
            // malformed data line, skip
          }
        }
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    handlers.onError?.(new Error(`Stream read error: ${String(e)}`));
  }
}

export async function confirmScheduleStream(
  request: ConfirmScheduleRequest,
  handlers: StreamHandlers,
  options?: StreamOptions,
): Promise<void> {
  if (isDemoMode()) {
    handlers.onComplete?.({
      intent: "PLAN_DAY",
      message: "Demo: schedule confirmed.",
    } as ChatResponse);
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/chat/confirm-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    handlers.onError?.(new Error(`Network error: ${String(e)}`));
    return;
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    handlers.onError?.(new Error(`Confirm schedule failed (${res.status}): ${text}`));
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
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === "phase") {
              const { phase, ...rest } = data;
              handlers.onPhase?.(phase as string, rest);
            } else if (currentEvent === "step") {
              handlers.onStep?.(data.intent, data);
            } else if (currentEvent === "thinking") {
              handlers.onThinkingToken?.(data.token);
            } else if (currentEvent === "message") {
              handlers.onMessageToken?.(data.token);
            } else if (currentEvent === "complete") {
              handlers.onComplete?.(data as ChatResponse);
            } else if (currentEvent === "error") {
              handlers.onError?.(new Error(data.error || "Schedule error"));
            }
          } catch {
            // malformed data line, skip
          }
        }
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    handlers.onError?.(new Error(`Stream read error: ${String(e)}`));
  }
}

// --- Task Lifecycle ---

export interface TaskUpdateRequest {
  user_id: string;
  title?: string;
  duration_minutes?: number;
  difficulty_weight?: number;
  status?: string;
}

export interface TaskResponse {
  task_id: string;
  status: string;
  message: string;
  replan_triggered?: boolean;
}

export async function updateTask(taskId: string, body: TaskUpdateRequest): Promise<TaskResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Task update failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function completeTask(taskId: string, userId: string, quality: number = 3): Promise<TaskResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, quality }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Task complete failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function skipTask(taskId: string, userId: string): Promise<TaskResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}/skip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Task skip failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function deleteTask(taskId: string, userId: string): Promise<TaskResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Task delete failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function acceptSchedule(request: {
  user_id: string;
  tasks: Array<Record<string, unknown>>;
  goal_metadata?: Record<string, unknown>;
}): Promise<{ status: string; task_count: number }> {
  const res = await fetch(`${API_BASE}/api/v1/chat/accept-schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Accept schedule failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function approveCalendar(id: string): Promise<void> {
  if (isDemoMode()) return;
  const res = await fetch(`${API_BASE}/api/v1/ingestion/pending-calendar/${id}/approve`, { method: "POST" });
  if (!res.ok) throw new Error(`Approval failed: ${res.status}`);
}

// --- Document Management ---

export interface IngestionDocument {
  id: string;
  user_id: string;
  source_id: string;
  file_name: string | null;
  media_type: string | null;
  document_topics: string[];
  chunk_count: number;
  created_at: string;
  linked_task_ids: string[];
}

export async function listDocuments(userId: string = "demo"): Promise<IngestionDocument[]> {
  if (isDemoMode()) return [];
  const res = await fetch(`${API_BASE}/api/v1/documents?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`Failed to list documents: ${res.status}`);
  const data = await res.json();
  return data.documents ?? [];
}

export async function deleteDocument(sourceId: string, userId: string = "demo"): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/documents/${encodeURIComponent(sourceId)}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`Failed to delete document: ${res.status}`);
}

// --- Session Management ---

export interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export async function listSessions(
  userId: string = "demo",
  limit: number = 30
): Promise<ChatSession[]> {
  if (isDemoMode()) return [];
  const params = new URLSearchParams({ user_id: userId, limit: String(limit) });
  const res = await fetch(`${API_BASE}/api/v1/sessions/?${params}`);
  if (!res.ok) throw new Error(`Failed to list sessions: ${res.status}`);
  const data = await res.json();
  return data.sessions ?? [];
}

export async function archiveSession(
  sessionId: string,
  userId: string = "demo"
): Promise<void> {
  if (isDemoMode()) return;
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}?${params}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(`Failed to archive session: ${res.status}`);
}

export async function renameSession(
  sessionId: string,
  title: string,
  userId: string = "demo"
): Promise<void> {
  if (isDemoMode()) return;
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, title }),
    }
  );
  if (!res.ok) throw new Error(`Failed to rename session: ${res.status}`);
}
