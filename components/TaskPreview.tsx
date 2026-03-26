"use client";

import { useState } from "react";

export interface ImplementationIntention {
  obstacle_trigger?: string;
  behavioral_response?: string;
}

export interface PreviewTask {
  task_id: string;
  title: string;
  duration_minutes: number;
  difficulty_weight: number;
  completion_criteria?: string;
  implementation_intention?: ImplementationIntention | string;
  dependencies?: string[];
}

interface TaskPreviewProps {
  tasks: PreviewTask[];
  goalMetadata?: { objective?: string; goal_id?: string };
  onConfirm: (editedTasks: PreviewTask[], goalMetadata?: Record<string, unknown>) => void;
  onCancel: () => void;
  onRegenerate?: () => void;
  isScheduling?: boolean;
}

function difficultyColor(w: number): string {
  if (w <= 0.4) return "bg-emerald-500";
  if (w <= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

function difficultyBorder(w: number): string {
  if (w <= 0.4) return "border-l-emerald-500";
  if (w <= 0.7) return "border-l-amber-500";
  return "border-l-red-500";
}

function difficultyLabel(w: number): string {
  if (w <= 0.3) return "Easy";
  if (w <= 0.5) return "Medium";
  if (w <= 0.7) return "Hard";
  return "Very Hard";
}

export function TaskPreview({ tasks: initialTasks, goalMetadata, onConfirm, onCancel, onRegenerate, isScheduling }: TaskPreviewProps) {
  const [tasks, setTasks] = useState<PreviewTask[]>(initialTasks);

  const totalMinutes = tasks.reduce((sum, t) => sum + t.duration_minutes, 0);

  const updateTask = (idx: number, updates: Partial<PreviewTask>) => {
    setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...updates } : t)));
  };

  const removeTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const addTask = () => {
    setTasks((prev) => [
      ...prev,
      {
        task_id: `custom_${Date.now()}`,
        title: "New task",
        duration_minutes: 15,
        difficulty_weight: 0.4,
      },
    ]);
  };

  const adjustDuration = (idx: number, delta: number) => {
    setTasks((prev) =>
      prev.map((t, i) =>
        i === idx ? { ...t, duration_minutes: Math.max(5, Math.min(60, t.duration_minutes + delta)) } : t
      )
    );
  };

  const adjustDifficulty = (idx: number, delta: number) => {
    setTasks((prev) =>
      prev.map((t, i) =>
        i === idx ? { ...t, difficulty_weight: Math.max(0.1, Math.min(1.0, +(t.difficulty_weight + delta).toFixed(1))) } : t
      )
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-600/50 bg-amber-950/25 p-4 space-y-4">
      {/* Stage header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">1</span>
          <div>
            <h4 className="text-sm font-semibold text-amber-300">Review & Customize Tasks</h4>
            {goalMetadata?.objective && (
              <p className="text-xs text-[var(--muted)] mt-0.5">{goalMetadata.objective}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-slate-200">{totalMinutes} min</span>
          <span className="text-xs text-[var(--muted)] ml-1.5">{tasks.length} tasks</span>
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Edit tasks below, then click &quot;Schedule&quot; to generate your daily plan.
      </p>

      {/* Task cards */}
      <div className="space-y-2.5">
        {tasks.map((task, idx) => (
          <div key={task.task_id} className={`bg-slate-900/80 rounded-lg p-3 text-sm border-l-2 ${difficultyBorder(task.difficulty_weight)}`}>
            {/* Title row */}
            <div className="flex items-start gap-2.5">
              <span className="text-[var(--muted)] font-mono text-xs mt-1 shrink-0 w-5 text-center">{idx + 1}</span>
              <input
                type="text"
                value={task.title}
                onChange={(e) => updateTask(idx, { title: e.target.value })}
                className="flex-1 bg-transparent text-slate-200 font-medium outline-none border-b border-transparent focus:border-slate-500 transition text-sm"
              />
              <button
                type="button"
                onClick={() => removeTask(idx)}
                className="w-6 h-6 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition shrink-0"
                title="Remove task"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-5 mt-2.5 ml-7">
              {/* Duration */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-10">Time</span>
                <button
                  type="button"
                  onClick={() => adjustDuration(idx, -5)}
                  className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center text-sm font-medium"
                >
                  -
                </button>
                <span className="text-slate-300 font-mono w-10 text-center text-sm">{task.duration_minutes}m</span>
                <button
                  type="button"
                  onClick={() => adjustDuration(idx, 5)}
                  className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>

              {/* Difficulty */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-6">Diff</span>
                <button
                  type="button"
                  onClick={() => adjustDifficulty(idx, -0.1)}
                  className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center text-sm font-medium"
                >
                  -
                </button>
                <div className="flex items-center gap-1.5 w-20">
                  <div className={`h-2 w-2 rounded-full ${difficultyColor(task.difficulty_weight)}`} />
                  <span className="text-slate-400 text-xs">{difficultyLabel(task.difficulty_weight)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustDifficulty(idx, 0.1)}
                  className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
            </div>

            {/* Duration nudge */}
            {task.duration_minutes > 25 && (
              <p className="text-amber-400/70 text-xs mt-2 ml-7">
                Tasks over 25 min may reduce focus. Consider splitting.
              </p>
            )}

            {/* Criteria */}
            {task.completion_criteria && (
              <p className="text-emerald-400/70 text-xs mt-2 ml-7">
                <span className="opacity-60">&#10003; </span>{task.completion_criteria}
              </p>
            )}
            {/* Implementation intention (WOOP) */}
            {task.implementation_intention && (() => {
              const ii = task.implementation_intention;
              const text = typeof ii === "string"
                ? ii
                : (ii.obstacle_trigger && ii.behavioral_response)
                  ? `If ${ii.obstacle_trigger} → ${ii.behavioral_response}`
                  : (ii as ImplementationIntention).obstacle_trigger || (ii as ImplementationIntention).behavioral_response || null;
              return text ? (
                <p className="text-amber-400/60 text-xs mt-1 ml-7">
                  <span className="opacity-60">&#8618; </span>{text}
                </p>
              ) : null;
            })()}
          </div>
        ))}
      </div>

      {/* Add task */}
      <button
        type="button"
        onClick={addTask}
        className="w-full py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 text-sm transition"
      >
        + Add task
      </button>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onConfirm(tasks, goalMetadata)}
          disabled={tasks.length === 0 || isScheduling}
          className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition"
        >
          {isScheduling ? "Scheduling..." : `Schedule ${tasks.length} tasks`}
        </button>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isScheduling}
            className="px-4 py-2.5 rounded-lg border border-amber-600/50 text-amber-400 hover:text-amber-300 hover:border-amber-500 text-sm transition disabled:opacity-50"
            title="Regenerate task breakdown"
          >
            Regenerate
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={isScheduling}
          className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
