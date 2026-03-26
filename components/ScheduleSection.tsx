"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { updateTask, skipTask, completeTask } from "@/lib/api";

// --- Time formatting ---

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

// --- Types ---

interface ScheduleSlot {
  start_min: number;
  end_min: number;
  title?: string;
  tmt_score?: number;
}

interface DecompTask {
  task_id: string;
  title: string;
  duration_minutes: number;
  difficulty_weight: number;
}

interface ScheduleSectionProps {
  schedule: Record<string, ScheduleSlot>;
  horizonStart: string;
  decomposition?: DecompTask[];
  userId?: string;
  isDraft?: boolean;
  onAccept?: () => void;
  onSuggestChanges?: (text: string) => void;
  acceptState?: "idle" | "accepting" | "accepted";
}

// --- Icons ---

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l3 3-9 9H2v-3l9-9z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 4 6-7" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3l6 5-6 5V3z" />
      <path d="M12 3v10" />
    </svg>
  );
}

function difficultyBorder(w: number): string {
  if (w <= 0.4) return "border-l-emerald-500";
  if (w <= 0.7) return "border-l-amber-500";
  return "border-l-red-500";
}

// --- Quality Rating (inline, shown on Done click) ---

function QualityRating({ onRate }: { onRate: (q: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-slate-700/40 bg-slate-950/40">
      <span className="text-xs text-slate-400 mr-1">How did it go?</span>
      {[1, 2, 3, 4, 5].map((q) => (
        <button
          key={q}
          onClick={() => onRate(q)}
          className="w-7 h-7 rounded-md text-xs font-semibold transition-colors hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 border border-slate-700/50"
        >
          {q}
        </button>
      ))}
      <button
        onClick={() => onRate(3)}
        className="ml-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Skip
      </button>
    </div>
  );
}

// --- Main Component ---

export function ScheduleSection({ schedule, horizonStart, decomposition, userId = "demo", isDraft, onAccept, onSuggestChanges, acceptState = "idle" }: ScheduleSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDuration, setEditDuration] = useState(25);
  const [saving, setSaving] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [localEdits, setLocalEdits] = useState<Record<string, { title?: string; duration?: number }>>({});
  const [subtasks, setSubtasks] = useState<Record<string, string[]>>({});
  const [addingSubtaskId, setAddingSubtaskId] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [suggestInput, setSuggestInput] = useState("");
  const [showSuggestInput, setShowSuggestInput] = useState(false);

  // Build title map from decomposition
  const titleMap: Record<string, string> = {};
  const durationMap: Record<string, number> = {};
  const difficultyMap: Record<string, number> = {};
  if (decomposition) {
    for (const t of decomposition) {
      titleMap[t.task_id] = t.title;
      durationMap[t.task_id] = t.duration_minutes;
      difficultyMap[t.task_id] = t.difficulty_weight;
    }
  }

  const startEdit = useCallback((id: string, slot: ScheduleSlot) => {
    const edited = localEdits[id];
    const title = edited?.title || slot.title || titleMap[id] || id.replace(/_/g, " ");
    const duration = edited?.duration || durationMap[id] || (slot.end_min - slot.start_min);
    setEditingId(id);
    setEditTitle(title);
    setEditDuration(duration);
    setAddingSubtaskId(null);
  }, [titleMap, durationMap, localEdits]);

  const cancelEdit = useCallback(() => setEditingId(null), []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    setLocalEdits((prev) => ({
      ...prev,
      [editingId]: { title: editTitle, duration: editDuration },
    }));
    try {
      await updateTask(editingId, {
        user_id: userId,
        title: editTitle,
        duration_minutes: editDuration,
      });
    } catch {
      // Task may not be persisted yet — local edit still applies
    }
    setSaving(false);
    setEditingId(null);
  }, [editingId, editTitle, editDuration, userId]);

  const removeTask = useCallback(async (id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
    try {
      await skipTask(id, userId);
    } catch {
      // Silently skip if task not in DB yet
    }
  }, [userId]);

  const handleDoneClick = useCallback((id: string) => {
    setRatingId(id);
  }, []);

  const handleRate = useCallback(async (id: string, quality: number) => {
    setCompletedIds((prev) => new Set(prev).add(id));
    setRatingId(null);
    try {
      await completeTask(id, userId, quality);
    } catch {
      // Task may not be persisted yet
    }
  }, [userId]);

  const handleSkip = useCallback(async (id: string) => {
    setSkippedIds((prev) => new Set(prev).add(id));
    try {
      await skipTask(id, userId);
    } catch {
      // Task may not be persisted yet
    }
  }, [userId]);

  const addSubtask = useCallback((parentId: string) => {
    const text = newSubtaskText.trim();
    if (!text) return;
    setSubtasks((prev) => ({
      ...prev,
      [parentId]: [...(prev[parentId] || []), text],
    }));
    setNewSubtaskText("");
    setAddingSubtaskId(null);
  }, [newSubtaskText]);

  const removeSubtask = useCallback((parentId: string, idx: number) => {
    setSubtasks((prev) => ({
      ...prev,
      [parentId]: (prev[parentId] || []).filter((_, i) => i !== idx),
    }));
  }, []);

  const handleSuggestSubmit = useCallback(() => {
    const text = suggestInput.trim();
    if (!text || !onSuggestChanges) return;
    onSuggestChanges(text);
    setSuggestInput("");
    setShowSuggestInput(false);
  }, [suggestInput, onSuggestChanges]);

  const entries = Object.entries(schedule).filter(([id]) => !removedIds.has(id));

  return (
    <div className="space-y-2.5">
      {/* Draft banner — prominent */}
      {isDraft && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/15 border-2 border-amber-500/40">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/25 text-amber-400 text-xs font-bold shrink-0">2</span>
          <div className="flex-1">
            <span className="text-amber-300 text-sm font-semibold">Draft Schedule</span>
            <span className="text-amber-400/70 text-xs ml-2">Review your schedule. Accept to save, or suggest changes.</span>
          </div>
        </div>
      )}

      {entries.map(([id, slot], taskIdx) => {
        const edited = localEdits[id];
        const title = edited?.title || slot.title || titleMap[id] || id.replace(/_/g, " ");
        const duration = edited?.duration || (slot.end_min - slot.start_min);
        const difficulty = difficultyMap[id] ?? 0.5;
        const isEditing = editingId === id;
        const taskSubtasks = subtasks[id] || [];
        const isAddingSubtask = addingSubtaskId === id;
        const isCompleted = completedIds.has(id);
        const isSkipped = skippedIds.has(id);
        const isShowingRating = ratingId === id;
        const isDone = isCompleted || isSkipped;

        return (
          <div
            key={id}
            className={`rounded-xl border overflow-hidden transition-all border-l-2 ${
              isCompleted
                ? "border-emerald-700/40 border-l-emerald-500 bg-emerald-950/30"
                : isSkipped
                  ? "border-slate-700/30 border-l-slate-600 bg-slate-950/40 opacity-60"
                  : `border-slate-700/50 ${difficultyBorder(difficulty)} bg-slate-900/60`
            }`}
          >
            {/* Main task row */}
            {isEditing ? (
              <div className="p-3.5 space-y-3 bg-slate-900/80">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 text-sm rounded-lg px-3 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none"
                  placeholder="Task title"
                  autoFocus
                />
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400 shrink-0">Duration</label>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-emerald-500"
                  />
                  <span className="text-sm text-slate-200 font-mono w-12 text-right font-semibold">{editDuration}m</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className="text-sm text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-3.5 py-3 group">
                {/* Task number */}
                <span className="text-xs text-[var(--muted)] font-mono w-5 text-center shrink-0">{taskIdx + 1}</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isCompleted && (
                      <span className="text-emerald-400 text-[10px] font-semibold bg-emerald-500/15 rounded px-1 py-0.5">Done</span>
                    )}
                    {isSkipped && (
                      <span className="text-slate-500 text-[10px] font-semibold bg-slate-700/40 rounded px-1 py-0.5">Skipped</span>
                    )}
                    <p className={`text-sm font-medium truncate leading-snug ${
                      isCompleted ? "text-slate-400 line-through" : isSkipped ? "text-slate-500 line-through" : "text-slate-100"
                    }`}>{title}</p>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {fmtTime(slot.start_min, horizonStart)} – {fmtTime(slot.end_min, horizonStart)}
                    <span className="ml-2 text-slate-500">{duration}m</span>
                  </p>
                </div>

                {/* Action buttons — always visible */}
                {!isDone && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDoneClick(id)}
                      title="Mark as done"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      onClick={() => handleSkip(id)}
                      title="Skip task"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      <SkipIcon />
                    </button>
                    <button
                      onClick={() => {
                        setAddingSubtaskId(isAddingSubtask ? null : id);
                        setEditingId(null);
                        setNewSubtaskText("");
                      }}
                      title="Add subtask"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors font-bold text-base"
                    >
                      +
                    </button>
                    <button
                      onClick={() => startEdit(id, slot)}
                      title="Edit task"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => removeTask(id)}
                      title="Remove task"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quality rating (shown when Done is clicked) */}
            {isShowingRating && (
              <QualityRating onRate={(q) => handleRate(id, q)} />
            )}

            {/* Subtasks list */}
            {taskSubtasks.length > 0 && (
              <div className="border-t border-slate-700/40 bg-slate-950/40 px-3.5 py-2.5 space-y-1.5">
                {taskSubtasks.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-2 group/sub">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shrink-0" />
                    <span className="text-xs text-slate-300 flex-1">{st}</span>
                    <button
                      onClick={() => removeSubtask(id, idx)}
                      className="opacity-0 group-hover/sub:opacity-100 text-slate-600 hover:text-red-400 transition-all text-sm leading-none"
                      title="Remove subtask"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask input */}
            {isAddingSubtask && (
              <div className="border-t border-slate-700/40 bg-slate-950/40 px-3.5 py-2.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 shrink-0" />
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSubtask(id);
                    if (e.key === "Escape") setAddingSubtaskId(null);
                  }}
                  placeholder="Add subtask..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600 border-b border-slate-700 focus:border-emerald-500 pb-0.5 transition-colors"
                />
                <button
                  onClick={() => addSubtask(id)}
                  disabled={!newSubtaskText.trim()}
                  className="text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-30 font-semibold transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setAddingSubtaskId(null)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        );
      })}

      {removedIds.size > 0 && (
        <p className="text-xs text-slate-500 italic px-1">
          {removedIds.size} task{removedIds.size > 1 ? "s" : ""} removed
        </p>
      )}

      {/* Suggest Changes input */}
      {isDraft && showSuggestInput && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50">
          <input
            type="text"
            value={suggestInput}
            onChange={(e) => setSuggestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSuggestSubmit();
              if (e.key === "Escape") setShowSuggestInput(false);
            }}
            placeholder='e.g. "make task 1 longer" or "add a 15-min review task"'
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-500"
          />
          <button
            onClick={handleSuggestSubmit}
            disabled={!suggestInput.trim()}
            className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold disabled:opacity-30 transition-colors px-2"
          >
            Send
          </button>
          <button
            onClick={() => setShowSuggestInput(false)}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Draft accept/reject buttons — sticky at bottom */}
      {isDraft && (
        <div className="sticky bottom-0 flex items-center gap-2 pt-3 pb-1 bg-[var(--background)]/95 backdrop-blur-sm">
          {acceptState === "accepted" ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium w-full justify-center py-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Schedule accepted!
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowSuggestInput(!showSuggestInput)}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-sm font-medium transition-colors"
              >
                Suggest Changes
              </button>
              <button
                onClick={onAccept}
                disabled={acceptState === "accepting"}
                className="px-6 py-2 rounded-lg text-sm font-medium
                           bg-emerald-500 hover:bg-emerald-600 text-white
                           transition-all active:scale-[0.97]
                           disabled:opacity-60 disabled:cursor-wait"
              >
                {acceptState === "accepting" ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor"
                              strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
                    </svg>
                    Accepting...
                  </span>
                ) : (
                  "Accept Schedule"
                )}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Link href="/schedule" className="text-xs text-emerald-400 hover:text-emerald-300 underline">
          → View full schedule
        </Link>
        <span className="text-xs text-slate-500">
          Tip: type &quot;reschedule&quot; or &quot;move X to 2 PM&quot; in chat
        </span>
      </div>
    </div>
  );
}
