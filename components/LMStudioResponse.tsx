"use client";

import { useState, useEffect } from "react";
import { Collapsible } from "./Collapsible";
import type { LMStudioStreamState, ToolCallEntry, LMSChatEndStats } from "@/lib/lmstudio-types";

interface LMStudioResponseProps {
  streamState: LMStudioStreamState;
  reasoning: string;
  content: string;
  toolCalls?: ToolCallEntry[];
  stats?: LMSChatEndStats | null;
  isStreaming: boolean;
}

/** Format duration in ms to "Xs" or "X.Xs" */
function fmtDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
}

/** Progress bar for model loading / prompt processing */
function ProgressBar({ label, progress }: { label: string; progress: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs text-[var(--muted)] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <span className="text-xs text-[var(--muted)] tabular-nums w-8 text-right">
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
}

/** Status pill showing current streaming phase */
function PhasePill({ phase }: { phase: string }) {
  const labels: Record<string, string> = {
    connecting: "Connecting...",
    model_loading: "Loading model...",
    prompt_processing: "Processing...",
    reasoning: "Thinking...",
    tool_calling: "Using tools...",
    responding: "Responding...",
  };
  const label = labels[phase];
  if (!label) return null;

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
      </span>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}

/** Single tool call activity row */
function ToolCallRow({ entry }: { entry: ToolCallEntry }) {
  const statusIcon =
    entry.status === "running" ? "\u23F3" :
    entry.status === "success" ? "\u2713" :
    "\u2717";
  const statusColor =
    entry.status === "running" ? "text-[var(--muted)]" :
    entry.status === "success" ? "text-emerald-400" :
    "text-red-400";

  return (
    <div className="flex items-start gap-2 py-1 text-xs">
      <span className={statusColor}>{statusIcon}</span>
      <div className="min-w-0">
        <span className="font-mono text-[var(--foreground)]">{entry.tool}</span>
        {entry.arguments != null && (
          <span className="text-[var(--muted)] ml-2 truncate">
            ({typeof entry.arguments === "string" ? entry.arguments : JSON.stringify(entry.arguments).slice(0, 60)})
          </span>
        )}
        {entry.status === "failure" && entry.failureReason && (
          <p className="text-red-400 mt-0.5">{entry.failureReason}</p>
        )}
        {entry.status === "success" && entry.output && (
          <p className="text-[var(--muted)] mt-0.5 truncate">{entry.output.slice(0, 100)}</p>
        )}
      </div>
    </div>
  );
}

export function LMStudioResponse({
  streamState,
  reasoning,
  content,
  toolCalls,
  stats,
  isStreaming,
}: LMStudioResponseProps) {
  const phase = streamState.phase;
  const [reasoningCollapsed, setReasoningCollapsed] = useState(false);

  // Auto-collapse reasoning when it's done and message starts
  useEffect(() => {
    if (!isStreaming && reasoning && content) {
      setReasoningCollapsed(true);
    }
  }, [isStreaming, reasoning, content]);

  const showPhase = isStreaming && ["connecting", "model_loading", "prompt_processing", "reasoning", "tool_calling", "responding"].includes(phase);
  const activeToolCalls = toolCalls || streamState.toolCalls;
  const activeStats = stats || streamState.stats;
  const reasoningDurationMs = streamState.reasoningDurationMs;

  return (
    <div className="space-y-1">
      {/* Model loading progress */}
      {phase === "model_loading" && (
        <ProgressBar label="Loading model" progress={streamState.modelLoadProgress} />
      )}

      {/* Prompt processing progress */}
      {phase === "prompt_processing" && (
        <ProgressBar label="Processing prompt" progress={streamState.promptProcessProgress} />
      )}

      {/* Phase indicator (when not showing progress bars) */}
      {showPhase && phase !== "model_loading" && phase !== "prompt_processing" && (
        <PhasePill phase={phase} />
      )}

      {/* Reasoning section */}
      {reasoning && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setReasoningCollapsed((c) => !c)}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1.5 w-full text-left"
          >
            <span>{reasoningCollapsed ? "\u25B6" : "\u25BC"}</span>
            <span>
              {isStreaming && phase === "reasoning"
                ? "Thinking..."
                : reasoningDurationMs
                  ? `Thought for ${fmtDuration(reasoningDurationMs)}`
                  : "Reasoning"}
            </span>
          </button>
          {!reasoningCollapsed && (
            <div className="mt-2 text-xs text-[var(--muted)] whitespace-pre-wrap font-mono max-h-52 overflow-y-auto leading-relaxed">
              {reasoning}
              {isStreaming && phase === "reasoning" && (
                <span className="animate-pulse text-[var(--accent)]">{"\u258C"}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tool calls section */}
      {activeToolCalls && activeToolCalls.length > 0 && (
        <Collapsible label={`Tool calls (${activeToolCalls.length})`} defaultExpanded>
          <div className="space-y-0.5">
            {activeToolCalls.map((tc, i) => (
              <ToolCallRow key={`${tc.tool}-${i}`} entry={tc} />
            ))}
          </div>
        </Collapsible>
      )}

      {/* Main message */}
      {(content || (isStreaming && phase === "responding")) && (
        <div
          className={`text-[var(--foreground)] whitespace-pre-wrap ${
            reasoning ? "pt-3 mt-3 border-t border-[var(--border)]" : "mt-1"
          }`}
        >
          {content}
          {isStreaming && phase === "responding" && !content && (
            <span className="text-[var(--muted)] text-xs">{"\u2026"}</span>
          )}
          {isStreaming && phase === "responding" && content && (
            <span className="animate-pulse text-[var(--accent)]">{"\u258C"}</span>
          )}
        </div>
      )}

      {/* Error display */}
      {phase === "error" && streamState.error && !content && (
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

      {/* Stats footer */}
      {!isStreaming && activeStats && (
        <div className="pt-2 mt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)] font-mono flex items-center gap-3">
          <span>{activeStats.tokens_per_second.toFixed(1)} tok/s</span>
          <span>TTFT: {activeStats.time_to_first_token_seconds.toFixed(2)}s</span>
          <span>{activeStats.total_output_tokens.toLocaleString()} tokens</span>
        </div>
      )}
    </div>
  );
}
