"use client";

import { useState, useEffect, useCallback } from "react";
import { listSessions, archiveSession, type ChatSession } from "@/lib/api";

interface SessionSidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewConversation: () => void;
}

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SessionSidebar({
  currentSessionId,
  onSelectSession,
  onNewConversation,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await listSessions("demo", 30);
      // Filter out archived, sort by updated_at descending
      const active = data
        .filter((s) => !s.is_archived)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      setSessions(active);
    } catch {
      // Silently degrade — sidebar is non-critical
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, currentSessionId]);

  const handleArchive = useCallback(
    async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      setArchivingId(sessionId);
      try {
        await archiveSession(sessionId, "demo");
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        // If we archived the active session, start fresh
        if (sessionId === currentSessionId) {
          onNewConversation();
        }
      } catch {
        // Silently degrade
      } finally {
        setArchivingId(null);
      }
    },
    [currentSessionId, onNewConversation]
  );

  const sidebarContent = (
    <div className="flex flex-col h-full w-64 bg-[var(--card-bg)] border-r border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
          Conversations
        </span>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="lg:hidden text-[var(--muted)] hover:text-[var(--foreground)] transition"
          aria-label="Close sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-3 py-2">
        <button
          type="button"
          onClick={() => {
            onNewConversation();
            setIsOpen(false);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--foreground)] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition"
        >
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {sessions.length === 0 && (
          <p className="text-xs text-[var(--muted)] text-center py-6 px-2">
            No conversations yet. Start chatting!
          </p>
        )}
        {sessions.map((session) => {
          const isActive = session.id === currentSessionId;
          const isHovered = hoveredId === session.id;
          const isArchiving = archivingId === session.id;

          return (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelectSession(session.id);
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectSession(session.id);
                  setIsOpen(false);
                }
              }}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`group relative flex items-center gap-2 w-full px-3 py-2 rounded-lg cursor-pointer transition text-sm ${
                isActive
                  ? "bg-emerald-500/15 border border-emerald-500/25 text-[var(--foreground)]"
                  : "hover:bg-[var(--border)]/30 text-[var(--foreground)] border border-transparent"
              }`}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}

              {/* Session title + date */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium leading-snug">
                  {session.title || "Untitled"}
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">
                  {relativeDate(session.updated_at)}
                </p>
              </div>

              {/* Archive button — shown on hover */}
              {(isHovered || isArchiving) && (
                <button
                  type="button"
                  onClick={(e) => handleArchive(e, session.id)}
                  disabled={isArchiving}
                  className="shrink-0 p-1 rounded text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10 transition disabled:opacity-50"
                  aria-label="Archive conversation"
                  title="Archive"
                >
                  {isArchiving ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] shadow transition"
        aria-label="Open sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-40 transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar — always visible */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </div>
    </>
  );
}
