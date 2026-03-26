"use client";

export const runtime = "edge";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WorkspaceView } from "@/components/WorkspaceView";
import { WorkspaceChatPanel } from "@/components/WorkspaceChatPanel";
import { getWorkspace } from "@/lib/api";
import { MOCK_WORKSPACE } from "@/lib/demoData";
import { cn } from "@/lib/utils";

export default function WorkspacePage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    getWorkspace(taskId, "demo")
      .then((w) => setWorkspace(w))
      .catch(() => setWorkspace(MOCK_WORKSPACE))
      .finally(() => setLoading(false));
  }, [taskId]);

  return (
    <div className="min-h-screen">
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-md p-8 shadow-xl">
            <p className="text-[var(--muted)] animate-pulse">Building your workspace...</p>
          </div>
        ) : workspace ? (
          <div className="flex gap-6">
            <div
              className={cn(
                "flex-1 min-w-0 transition-all duration-300",
                chatOpen ? "max-w-2xl" : "max-w-4xl"
              )}
            >
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-md p-8 shadow-xl">
                <WorkspaceView
                  taskId={workspace.task_id}
                  taskTitle={workspace.task_title}
                  primaryObjective={workspace.primary_objective}
                  surfacedAssets={workspace.surfaced_assets}
                />
              </div>
            </div>
            <aside
              className={cn(
                "w-full transition-all duration-300 flex flex-col",
                chatOpen ? "max-w-sm shrink-0" : "max-w-0 overflow-hidden"
              )}
            >
              {chatOpen && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-md p-4 shadow-xl sticky top-8 h-[calc(100vh-6rem)] flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--foreground)]">Task chat</span>
                    <button
                      onClick={() => setChatOpen(false)}
                      className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded"
                      aria-label="Close chat"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <WorkspaceChatPanel
                    context={{
                      taskTitle: workspace.task_title,
                      primaryObjective: workspace.primary_objective,
                      surfacedAssets: workspace.surfaced_assets.map((a: { title: string; content_or_url: string }) => ({
                        title: a.title,
                        content_or_url: a.content_or_url,
                      })),
                    }}
                  />
                </div>
              )}
            </aside>
            {!chatOpen && (
              <button
                onClick={() => setChatOpen(true)}
                className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[var(--accent)] text-white shadow-lg hover:opacity-90 flex items-center justify-center z-50"
                aria-label="Open chat"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-md p-8 shadow-xl">
            <p className="text-red-500">Failed to load workspace</p>
          </div>
        )}
      </main>
    </div>
  );
}
