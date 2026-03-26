"use client";

import { useState, useEffect } from "react";
import type { ChatResponse } from "@/lib/api";
import { TextWithAbbr } from "@/components/TextWithAbbr";
import { Collapsible } from "@/components/Collapsible";

interface ResponseLayersProps {
  content: string;
  thinking?: string;
  response?: ChatResponse;
  isStreaming?: boolean;
  animate?: boolean;
}

const SECTION_DELAYS = [0, 200, 500, 900, 1200, 1500]; // ms

const INTENT_STYLES: Record<string, string> = {
  PLAN_DAY: "bg-emerald-900/60 text-emerald-300 border border-emerald-700",
  KNOWLEDGE_INGESTION: "bg-blue-900/60 text-blue-300 border border-blue-700",
  BEHAVIORAL_CONSTRAINT: "bg-amber-900/60 text-amber-300 border border-amber-700",
  CALENDAR_SYNC: "bg-purple-900/60 text-purple-300 border border-purple-700",
  ACTION_ITEM: "bg-rose-900/60 text-rose-300 border border-rose-700",
  GREETING: "bg-slate-800 text-slate-400 border border-slate-600",
  TASK_QA: "bg-slate-800 text-slate-400 border border-slate-600",
};

function difficultyColor(w: number): string {
  if (w <= 0.4) return "bg-emerald-500";
  if (w <= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

function fmtTime(min: number, horizonStart: string): string {
  try {
    const base = new Date(horizonStart);
    base.setMinutes(base.getMinutes() + min);
    return base.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return `+${min}m`;
  }
}

export function ResponseLayers({ content, thinking, response, isStreaming = false, animate = false }: ResponseLayersProps) {
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : 99);

  useEffect(() => {
    if (!animate) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    SECTION_DELAYS.forEach((delay, i) => {
      timers.push(
        setTimeout(() => setVisibleCount((n) => Math.max(n, i + 1)), delay)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  // No response object and not streaming = error message; render plain text only
  if (!response && !isStreaming && !thinking && !content) {
    return <p className="text-slate-100 whitespace-pre-wrap">{content}</p>;
  }
  if (!response && !isStreaming) {
    return <p className="text-slate-100 whitespace-pre-wrap">{content}</p>;
  }

  const intent = response?.intent ?? "GREETING";
  const intentStyle = INTENT_STYLES[intent] ?? INTENT_STYLES.GREETING;
  const activeThinking = thinking || response?.thinking_process || "";

  return (
    <div className="space-y-1">
      {/* Section 0: Intent badge — show once we have a response or after streaming */}
      {(visibleCount >= 1 || isStreaming) && response && (
        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide ${intentStyle}`}>
          {intent}
        </div>
      )}

      {/* Section 1: Thinking process — live during streaming */}
      {(visibleCount >= 2 || isStreaming) && activeThinking && (
        <Collapsible label="⚙ Internal reasoning" defaultExpanded>
          <div className="text-xs text-slate-400 whitespace-pre-wrap font-mono max-h-52 overflow-y-auto leading-relaxed">
            <TextWithAbbr text={activeThinking} />
            {isStreaming && <span className="animate-pulse text-emerald-400">▌</span>}
          </div>
        </Collapsible>
      )}

      {/* Section 2: Main message — live during streaming */}
      {(visibleCount >= 3 || isStreaming) && (content || isStreaming) && (
        <div className={`text-slate-100 whitespace-pre-wrap ${activeThinking ? "pt-3 mt-3 border-t border-slate-700" : "mt-1"}`}>
          {content}
          {isStreaming && !content && <span className="text-slate-500 text-xs">…</span>}
          {isStreaming && content && <span className="animate-pulse text-emerald-400">▌</span>}
        </div>
      )}

      {/* Section 3: Execution graph — hidden while streaming */}
      {!isStreaming && visibleCount >= 4 && response?.execution_graph && (
        <Collapsible
          label={`📋 Task breakdown (${response.execution_graph.decomposition.length} tasks)`}
          defaultExpanded
        >
          <div className="space-y-2">
            {response.execution_graph.decomposition.map((task) => (
              <div key={task.task_id} className="bg-slate-900 rounded-md p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-slate-200 font-medium">{task.title}</span>
                  <span className="text-slate-500 shrink-0">{task.duration_minutes} min</span>
                </div>
                {/* Difficulty bar */}
                <div className="h-1 w-full bg-slate-700 rounded-full mb-2">
                  <div
                    className={`h-1 rounded-full ${difficultyColor(task.difficulty_weight)}`}
                    style={{ width: `${Math.round(task.difficulty_weight * 100)}%` }}
                  />
                </div>
                {task.completion_criteria && (
                  <p className="text-emerald-400 mb-1">
                    <span className="opacity-60">✓ </span>{task.completion_criteria}
                  </p>
                )}
                {task.implementation_intention && (
                  <p className="text-amber-400/80">
                    <span className="opacity-60">↳ </span>{task.implementation_intention}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Collapsible>
      )}

      {/* Section 4: Schedule summary — hidden while streaming */}
      {!isStreaming && visibleCount >= 5 && response?.schedule && (
        <Collapsible label={`🗓 Schedule (${Object.keys(response.schedule.schedule).length} tasks)`}>
          <div className="space-y-1">
            {Object.entries(response.schedule.schedule).map(([id, slot]) => {
              const horizonStart = response.schedule!.horizon_start ?? new Date().toISOString();
              const title =
                slot.title ??
                response.execution_graph?.decomposition.find((t) => t.task_id === id)?.title ??
                id;
              return (
                <div key={id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate max-w-[60%]">{title}</span>
                  <span className="text-slate-500 font-mono shrink-0">
                    {fmtTime(slot.start_min, horizonStart)} – {fmtTime(slot.end_min, horizonStart)}
                  </span>
                </div>
              );
            })}
            <a
              href="/schedule"
              className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300 underline"
            >
              → View full schedule
            </a>
          </div>
        </Collapsible>
      )}

      {/* Section 5: Ingestion result — hidden while streaming */}
      {!isStreaming && visibleCount >= 6 && response?.ingestion_result && (
        <Collapsible label="📥 Ingestion result">
          <div className="text-xs text-slate-400 space-y-1">
            {(() => {
              const kr = (response.ingestion_result as Record<string, unknown>)?.knowledge_result as Record<string, unknown> | undefined;
              const count = kr?.stored_chunk_count as number | undefined;
              const actions = kr?.suggested_actions as string[] | undefined;
              return (
                <>
                  {count != null && (
                    <p className="text-slate-300">
                      <span className="text-blue-400 font-semibold">{count}</span> chunks stored in ChromaDB
                    </p>
                  )}
                  {actions && actions.length > 0 && (
                    <p>
                      Suggested:{" "}
                      {actions.map((a) => (
                        <span key={a} className="inline-block bg-slate-700 rounded px-1.5 py-0.5 mr-1 text-slate-300">{a}</span>
                      ))}
                    </p>
                  )}
                  {!count && !actions && (
                    <pre className="text-slate-500 text-[10px] overflow-x-auto">
                      {JSON.stringify(response.ingestion_result, null, 2)}
                    </pre>
                  )}
                </>
              );
            })()}
          </div>
        </Collapsible>
      )}
    </div>
  );
}
