import type { ChatResponse } from "./demoData";
import type { JarvisMessage } from "./jarvis-types";

const KEY = "jarvis-last-chat-response";
const CHAT_KEY = "jarvis-chat-messages";
const DRAFT_KEY = "jarvis-draft-schedule";
const MAX_PERSISTED_MESSAGES = 50;

export function saveLastChatResponse(r: ChatResponse): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {}
}

export function loadLastChatResponse(): ChatResponse | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChatResponse) : null;
  } catch {
    return null;
  }
}

/** Persist chat messages to localStorage (strips heavy fields, caps at 50). */
export function saveChatMessages(messages: JarvisMessage[]): void {
  try {
    const persistable = messages
      .filter((m) => !m.isStreaming)
      .slice(-MAX_PERSISTED_MESSAGES)
      .map((m) => ({
        ...m,
        // Strip heavy fields to save space
        response: m.response
          ? {
              ...m.response,
              thinking_process: undefined,
            }
          : undefined,
        phaseHistory: m.phaseHistory?.slice(0, 20),
      }));
    localStorage.setItem(CHAT_KEY, JSON.stringify(persistable));
  } catch {}
}

export function loadChatMessages(): JarvisMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? (JSON.parse(raw) as JarvisMessage[]) : [];
  } catch {
    return [];
  }
}

export function clearChatMessages(): void {
  try {
    localStorage.removeItem(CHAT_KEY);
  } catch {}
}

// --- Draft schedule persistence ---

export function saveDraftSchedule(r: ChatResponse): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(r));
  } catch {}
}

export function loadDraftSchedule(): ChatResponse | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ChatResponse) : null;
  } catch {
    return null;
  }
}

export function clearDraftSchedule(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function promoteDraftToFinal(r: ChatResponse): void {
  saveLastChatResponse(r);
  clearDraftSchedule();
}
