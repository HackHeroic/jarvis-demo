"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Collapsible } from "./Collapsible";
import { ScheduleSection } from "./ScheduleSection";
import ClarificationCard from "./ClarificationCard";
import ReplanBanner from "./ReplanBanner";
import type { ChatResponse } from "@/lib/demoData";
import type { JarvisStreamState, PhaseEventData } from "@/lib/jarvis-types";

interface JarvisResponseProps {
  streamState: JarvisStreamState;
  reasoning: string;
  content: string;
  response?: ChatResponse;
  isStreaming: boolean;
  onAcceptSchedule?: () => void;
  onSuggestChanges?: (text: string) => void;
  onClarificationSelect?: (option: string) => void;
  onReplan?: () => void;
  isReplanning?: boolean;
  acceptState?: "idle" | "accepting" | "accepted";
}

// --- Data-driven phase label (Step 9b) ---

function phaseLabel(phase: string, data: Record<string, unknown> | null): string {
  // Prefer phase_summary from backend when available
  if (data?.phase_summary) return data.phase_summary as string;

  if (!data) {
    const simple: Record<string, string> = {
      connecting: "Connecting...",
      synthesizing: "Composing response...",
      reasoning: "Thinking...",
      responding: "Responding...",
      awaiting_confirmation: "Waiting for task review...",
      confirming: "Scheduling confirmed tasks...",
    };
    return simple[phase] || phase.replace(/_/g, " ");
  }

  switch (phase) {
    case "brain_dump_extraction":
      return "Analyzing your input...";
    case "intent_classified": {
      const intent = data.intent as string || "unknown";
      const habits = data.habit_count as number || 0;
      const actions = data.action_count as number || 0;
      let detail = `Classified as ${intent}`;
      if (habits > 0) detail += ` \u2014 ${habits} habit${habits > 1 ? "s" : ""} detected`;
      if (actions > 0) detail += `, ${actions} action item${actions > 1 ? "s" : ""}`;
      return detail;
    }
    case "habits_saved":
      return `Saved ${data.count || 0} habit${(data.count as number) !== 1 ? "s" : ""} to memory`;
    case "habits_fetched":
      return data.has_habits ? "Retrieved behavioral constraints" : "No existing habits found";
    case "habits_translated":
      return `Translated habits into ${data.slot_count || 0} time slots`;
    case "plan_day_start":
      return "Starting plan-day pipeline...";
    case "decomposing":
      return "Breaking down your goal into tasks (27B)...";
    case "decomposition_done":
      return `Created ${data.task_count || 0} tasks (${data.total_minutes || 0} min total)`;
    case "scheduling":
      return `Scheduling ${data.task_count || 0} tasks with OR-Tools...`;
    case "schedule_done": {
      const status = data.status as string;
      if (status === "OPTIMAL") {
        return `Scheduled ${data.task_count || 0} tasks across ${data.horizon_hours || 0}h`;
      }
      return `Schedule: ${status}`;
    }
    case "synthesizing":
      return "Jarvis is composing response...";
    default:
      return phase.replace(/_/g, " ");
  }
}

// --- Intent badge (extensible, not hardcoded fallback) ---

const INTENT_STYLES: Record<string, string> = {
  PLAN_DAY: "bg-emerald-900/60 text-emerald-300 border border-emerald-700",
  GENERAL_QA: "bg-cyan-900/60 text-cyan-300 border border-cyan-700",
  KNOWLEDGE_INGESTION: "bg-blue-900/60 text-blue-300 border border-blue-700",
  BEHAVIORAL_CONSTRAINT: "bg-amber-900/60 text-amber-300 border border-amber-700",
  CALENDAR_SYNC: "bg-purple-900/60 text-purple-300 border border-purple-700",
  ACTION_ITEM: "bg-rose-900/60 text-rose-300 border border-rose-700",
  GREETING: "bg-slate-800 text-slate-400 border border-slate-600",
};

function intentStyle(intent: string): string {
  return INTENT_STYLES[intent] || "bg-slate-800 text-slate-300 border border-slate-600";
}

// --- Strip leaked think tags (safety net) ---

function stripThinkTags(text: string): string {
  return text.replace(/<\/?think>/gi, "").trim();
}

// --- Utility ---

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
}

function difficultyColor(w: number): string {
  if (w <= 0.4) return "bg-emerald-500";
  if (w <= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

function fmtTime(min: number, horizonStart: string): string {
  try {
    const base = new Date(horizonStart);
    if (isNaN(base.getTime())) return `+${min}m`;
    const target = new Date(base.getTime() + min * 60000);
    return target.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return `+${min}m`;
  }
}

// --- Phase progress indicator ---

function formatModelShort(model: string | null | undefined): string | null {
  if (!model) return null;
  const parts = model.split("/");
  return parts[parts.length - 1];
}

function PhaseIndicator({ streamState }: { streamState: JarvisStreamState }) {
  const { phase, currentPhaseData, phaseHistory, activeModel } = streamState;
  const isPipeline = !["idle", "complete", "error", "aborted", "reasoning", "responding"].includes(phase);

  if (!isPipeline && phase !== "reasoning" && phase !== "responding" && phase !== "synthesizing" && phase !== "connecting") {
    return null;
  }

  const label = phaseLabel(phase, currentPhaseData);
  const modelShort = formatModelShort(activeModel) || formatModelShort(currentPhaseData?.model as string);

  return (
    <div className="space-y-1">
      {/* Show completed phases as a compact trail */}
      {phaseHistory.length > 0 && (
        <div className="space-y-0.5">
          {phaseHistory.slice(0, -1).map((pe, i) => {
            const peModel = formatModelShort(pe.model as string);
            const durationMs = pe.duration_ms as number | undefined;
            return (
              <div key={i} className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                <span className="text-emerald-400">{"\u2713"}</span>
                <span>{phaseLabel(pe.phase, pe)}</span>
                {peModel && (
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-800 rounded px-1">{peModel}</span>
                )}
                {durationMs != null && (
                  <span className="text-[9px] text-slate-500">{(durationMs / 1000).toFixed(1)}s</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Current active phase */}
      <div className="flex items-center gap-2 py-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
        </span>
        <span className="text-xs text-[var(--muted)]">{label}</span>
        {modelShort && (
          <span className="text-[9px] font-mono text-emerald-400/70 bg-emerald-900/30 rounded px-1">{modelShort}</span>
        )}
      </div>
    </div>
  );
}

// --- Section registry (Step 9c: data-driven section rendering) ---

interface SectionDef {
  key: string;
  label: (data: Record<string, unknown>) => string;
  render: (data: Record<string, unknown>, response: ChatResponse) => React.ReactNode;
}

const RESPONSE_SECTIONS: SectionDef[] = [
  {
    key: "execution_graph",
    label: (data) => `Task breakdown (${(data as Record<string, unknown>)?.decomposition ? ((data as Record<string, unknown>).decomposition as unknown[]).length : 0} tasks)`,
    render: (data) => {
      const decomp = (data as Record<string, unknown>).decomposition as Array<Record<string, unknown>> | undefined;
      if (!decomp) return null;
      return (
        <div className="space-y-2">
          {decomp.map((task) => (
            <div key={task.task_id as string} className="bg-slate-900 rounded-md p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-slate-200 font-medium">{task.title as string}</span>
                <span className="text-slate-500 shrink-0">{task.duration_minutes as number} min</span>
              </div>
              <div className="h-1 w-full bg-slate-700 rounded-full mb-2">
                <div
                  className={`h-1 rounded-full ${difficultyColor(task.difficulty_weight as number)}`}
                  style={{ width: `${Math.round((task.difficulty_weight as number) * 100)}%` }}
                />
              </div>
              {task.completion_criteria != null && (
                <p className="text-emerald-400 mb-1">
                  <span className="opacity-60">{"\u2713"} </span>{String(task.completion_criteria)}
                </p>
              )}
              {task.implementation_intention != null && (() => {
                const ii = task.implementation_intention as Record<string, string> | string;
                const text = typeof ii === "string"
                  ? ii
                  : (ii.obstacle_trigger && ii.behavioral_response)
                    ? `If ${ii.obstacle_trigger} → ${ii.behavioral_response}`
                    : ii.obstacle_trigger || ii.behavioral_response || null;
                return text ? (
                  <p className="text-amber-400/80 text-[11px]">
                    <span className="opacity-60">{"\u21B3"} </span>{text}
                  </p>
                ) : null;
              })()}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "schedule",
    label: (data) => `Schedule (${Object.keys((data as Record<string, unknown>).schedule || {}).length} tasks)`,
    render: (data, response) => {
      const schedule = (data as Record<string, unknown>).schedule as Record<string, { start_min: number; end_min: number; title?: string }> | undefined;
      const horizonStart = ((data as Record<string, unknown>).horizon_start as string) ?? new Date().toISOString();
      if (!schedule) return null;
      const graph = (response as unknown as Record<string, unknown>)?.execution_graph as Record<string, unknown> | undefined;
      const decomp = graph?.decomposition as Array<{ task_id: string; title: string; duration_minutes: number; difficulty_weight: number }> | undefined;
      const isDraft = (response as unknown as Record<string, unknown>)?.schedule_status === "draft";
      return (
        <ScheduleSection
          schedule={schedule}
          horizonStart={horizonStart}
          decomposition={decomp}
          isDraft={isDraft}
        />
      );
    },
  },
  {
    key: "ingestion_result",
    label: () => "Ingestion result",
    render: (data) => {
      const kr = (data as Record<string, unknown>)?.knowledge_result as Record<string, unknown> | undefined;
      const count = kr?.stored_chunk_count as number | undefined;
      const actions = kr?.suggested_actions as string[] | undefined;
      const pendingId = (data as Record<string, unknown>)?.pending_calendar_id as string | undefined;
      return (
        <div className="text-xs text-slate-400 space-y-1">
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
          {pendingId && (
            <p className="text-purple-400">
              Calendar extraction pending approval (ID: {pendingId})
            </p>
          )}
          {!count && !actions && !pendingId && (
            <pre className="text-slate-500 text-[10px] overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      );
    },
  },
  {
    key: "action_proposals",
    label: (data) => `Action proposals (${Array.isArray(data) ? data.length : 0})`,
    render: (data) => {
      const proposals = data as unknown as Array<Record<string, unknown>>;
      if (!Array.isArray(proposals)) return null;
      return (
        <div className="space-y-2">
          {proposals.map((p, i) => (
            <div key={i} className="bg-slate-900 rounded-md p-2.5 text-xs">
              <p className="text-slate-200 font-medium">{p.title as string}</p>
              <p className="text-slate-400 mt-0.5">{p.summary as string}</p>
              {p.deadline_date != null && (
                <p className="text-rose-400 mt-0.5 text-[10px]">Deadline: {String(p.deadline_date)}</p>
              )}
              {(p.suggested_actions as string[])?.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {(p.suggested_actions as string[]).map((a) => (
                    <span key={a} className="bg-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[10px]">{a}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "search_result",
    label: () => "Search results",
    render: (data) => {
      const queries = (data as Record<string, unknown>).queries as string[] | undefined;
      const summaries = (data as Record<string, unknown>).summaries as string[] | undefined;
      return (
        <div className="text-xs text-slate-400 space-y-1">
          {queries?.map((q, i) => (
            <div key={i}>
              <p className="text-slate-300 font-medium">{q}</p>
              {summaries?.[i] && <p className="text-slate-400 mt-0.5">{summaries[i]}</p>}
            </div>
          ))}
        </div>
      );
    },
  },
];

// --- Pipeline trace (persisted phase history after streaming) ---

function PipelineTrace({ phaseHistory }: { phaseHistory: PhaseEventData[] }) {
  const [open, setOpen] = useState(false);

  // Compute total pipeline duration from first started_at_ms to last duration_ms
  const stepsWithDuration = phaseHistory.filter((pe) => pe.duration_ms != null);
  const totalMs = stepsWithDuration.reduce((acc, pe) => acc + (pe.duration_ms as number), 0);

  // Filter to meaningful steps (skip intermediate/noisy phases)
  const SKIP_PHASES = new Set(["connecting", "synthesizing", "reasoning", "responding", "awaiting_confirmation", "confirming"]);
  const steps = phaseHistory.filter((pe) => !SKIP_PHASES.has(pe.phase));

  if (steps.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-2 w-full text-left"
      >
        <span className="text-[9px]">{open ? "\u25BC" : "\u25B6"}</span>
        <span className="flex items-center gap-1.5">
          <span>{steps.length} pipeline step{steps.length !== 1 ? "s" : ""}</span>
          {totalMs > 0 && (
            <span className="text-[10px] font-mono text-[var(--muted)] opacity-70">
              {totalMs >= 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`} total
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 border-l-2 border-[var(--border)] pl-3">
          {steps.map((pe, i) => {
            const model = pe.model as string | undefined;
            const durationMs = pe.duration_ms as number | undefined;
            const modelShort = model ? model.split("/").pop() : null;
            return (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className="text-emerald-400 mt-px shrink-0">✓</span>
                <span className="flex-1 text-[var(--muted)]">{phaseLabel(pe.phase, pe)}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {modelShort && (
                    <span className="font-mono text-[9px] bg-[var(--card-bg)] border border-[var(--border)] rounded px-1 text-[var(--muted)]">
                      {modelShort}
                    </span>
                  )}
                  {durationMs != null && (
                    <span className="font-mono text-[10px] text-[var(--muted)] opacity-60">
                      {durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function JarvisResponse({
  streamState,
  reasoning,
  content,
  response,
  isStreaming,
  onAcceptSchedule,
  onSuggestChanges,
  onClarificationSelect,
  onReplan,
  isReplanning,
  acceptState,
}: JarvisResponseProps) {
  const phase = streamState.phase;
  const intent = streamState.intent || response?.intent;
  const [reasoningCollapsed, setReasoningCollapsed] = useState(true);

  // Strip leaked <think> tags from content and reasoning
  const cleanReasoning = stripThinkTags(reasoning);
  const cleanContent = stripThinkTags(content);

  const reasoningDurationMs = streamState.reasoningDurationMs;
  const showPhaseIndicator = isStreaming && phase !== "complete";

  return (
    <div className="space-y-1">
      {/* Intent badge */}
      {intent && (
        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide ${intentStyle(intent)}`}>
          {intent}
        </div>
      )}

      {/* Pipeline phase progress */}
      {showPhaseIndicator && (
        <PhaseIndicator streamState={streamState} />
      )}

      {/* Reasoning section */}
      {(cleanReasoning || (isStreaming && phase === "reasoning")) && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setReasoningCollapsed((c) => !c)}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-2 w-full text-left"
          >
            <span className="text-[9px]">{reasoningCollapsed ? "\u25B6" : "\u25BC"}</span>
            <span className="flex items-center gap-1.5">
              {isStreaming && phase === "reasoning" ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]" />
                  </span>
                  <span>Thinking...</span>
                </>
              ) : reasoningDurationMs ? (
                `Thought for ${fmtDuration(reasoningDurationMs)}`
              ) : (
                "Reasoning"
              )}
            </span>
          </button>
          {!reasoningCollapsed && cleanReasoning && (
            <div className="mt-2 text-xs text-[var(--muted)] max-h-64 overflow-y-auto leading-relaxed border-l-2 border-[var(--border)] pl-3 space-y-0.5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="text-[var(--muted)] my-0.5 text-[11px]">{children}</p>,
                  li: ({ children }) => <li className="text-[var(--muted)] my-0 text-[11px]">{children}</li>,
                  strong: ({ children }) => <strong className="text-[var(--muted)] font-medium">{children}</strong>,
                  h1: ({ children }) => <p className="text-[var(--muted)] font-medium text-[11px] mt-1">{children}</p>,
                  h2: ({ children }) => <p className="text-[var(--muted)] font-medium text-[11px] mt-1">{children}</p>,
                  h3: ({ children }) => <p className="text-[var(--muted)] text-[11px] mt-1">{children}</p>,
                }}
              >
                {cleanReasoning}
              </ReactMarkdown>
              {isStreaming && phase === "reasoning" && (
                <span className="animate-pulse text-[var(--accent)]">{"\u258C"}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main message */}
      {(cleanContent || (isStreaming && phase === "responding")) && (
        <div
          className={`${
            cleanReasoning ? "pt-3 mt-3 border-t border-[var(--border)]" : "mt-1"
          }`}
        >
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-[var(--foreground)] prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
            prose-p:text-[var(--foreground)] prose-p:leading-relaxed prose-p:my-1
            prose-strong:text-[var(--foreground)]
            prose-code:text-emerald-400 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-900 prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-lg prose-pre:my-2
            prose-li:text-[var(--foreground)] prose-li:my-0
            prose-ul:my-1 prose-ol:my-1
            prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-[var(--accent)] prose-blockquote:text-[var(--muted)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {cleanContent}
            </ReactMarkdown>
          </div>
          {isStreaming && phase === "responding" && !cleanContent && (
            <span className="text-[var(--muted)] text-xs">{"\u2026"}</span>
          )}
          {isStreaming && phase === "responding" && cleanContent && (
            <span className="animate-pulse text-[var(--accent)]">{"\u258C"}</span>
          )}
        </div>
      )}

      {/* Clarification quick-reply buttons */}
      {response?.clarification_options &&
        response.clarification_options.length > 0 &&
        !isStreaming && (
          <ClarificationCard
            options={response.clarification_options}
            onSelect={onClarificationSelect || (() => {})}
            disabled={isStreaming}
          />
        )}

      {/* Error display */}
      {phase === "error" && streamState.error && !cleanContent && (
        <div className="text-red-400 text-sm py-1">
          {streamState.error}
        </div>
      )}

      {/* Aborted indicator */}
      {phase === "aborted" && (
        <div className="text-[var(--muted)] text-xs italic py-1">
          Generation stopped
        </div>
      )}

      {/* Data-driven response sections (Step 9c) */}
      {!isStreaming && response && (
        <div className="mt-3 space-y-2">
          {RESPONSE_SECTIONS.map(({ key, label, render }) => {
            const data = (response as unknown as Record<string, unknown>)[key];
            if (!data) return null;

            // Draft schedule: render directly (not in collapsible) for prominence
            if (key === "schedule" && response.schedule_status === "draft") {
              const schedule = (data as Record<string, unknown>).schedule as Record<string, { start_min: number; end_min: number; title?: string }> | undefined;
              const horizonStart = ((data as Record<string, unknown>).horizon_start as string) ?? new Date().toISOString();
              if (!schedule) return null;
              const graph = (response as unknown as Record<string, unknown>)?.execution_graph as Record<string, unknown> | undefined;
              const decomp = graph?.decomposition as Array<{ task_id: string; title: string; duration_minutes: number; difficulty_weight: number }> | undefined;
              return (
                <div key={key} className="mt-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-sm font-semibold text-slate-200">Your Proposed Schedule</span>
                    <span className="text-xs text-[var(--muted)]">({Object.keys(schedule).length} tasks)</span>
                  </div>
                  <ScheduleSection
                    schedule={schedule}
                    horizonStart={horizonStart}
                    decomposition={decomp}
                    isDraft
                    onAccept={onAcceptSchedule}
                    onSuggestChanges={onSuggestChanges}
                    acceptState={acceptState}
                  />
                </div>
              );
            }

            return (
              <Collapsible key={key} label={label(data as Record<string, unknown>)} defaultExpanded={key === "execution_graph" || key === "schedule"}>
                {render(data as Record<string, unknown>, response)}
              </Collapsible>
            );
          })}

          {/* Suggested action banner */}
          {response.suggested_action === "replan" && !isStreaming && onReplan && (
            <ReplanBanner
              onReplan={onReplan}
              isReplanning={isReplanning}
            />
          )}
        </div>
      )}

      {/* Pipeline trace — collapsed steps with model + timing, like Claude's "steps" */}
      {!isStreaming && streamState.phaseHistory.length > 0 && (
        <PipelineTrace phaseHistory={streamState.phaseHistory} />
      )}

      {/* Generation metrics bar (like LM Studio) */}
      {!isStreaming && response?.generation_metrics && (
        <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500 font-mono">
          {response.generation_metrics.model && (
            <span className="flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              {formatModelShort(response.generation_metrics.model)}
            </span>
          )}
          {response.generation_metrics.tok_per_sec > 0 && (
            <span>{response.generation_metrics.tok_per_sec.toFixed(1)} tok/sec</span>
          )}
          {response.generation_metrics.total_tokens > 0 && (
            <span>{response.generation_metrics.total_tokens} tokens</span>
          )}
          {response.generation_metrics.total_time_s > 0 && (
            <span>{response.generation_metrics.total_time_s.toFixed(1)}s</span>
          )}
          {response.generation_metrics.ttft_ms != null && (
            <span>TTFT: {response.generation_metrics.ttft_ms < 1000
              ? `${response.generation_metrics.ttft_ms.toFixed(0)}ms`
              : `${(response.generation_metrics.ttft_ms / 1000).toFixed(1)}s`
            }</span>
          )}
        </div>
      )}
    </div>
  );
}
