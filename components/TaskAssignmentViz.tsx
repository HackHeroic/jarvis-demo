"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Abbr } from "@/components/Abbr";
import { cn } from "@/lib/utils";

interface TaskChunk {
  task_id: string;
  title: string;
  duration_minutes: number;
  difficulty_weight: number;
}

interface TaskAssignmentVizProps {
  goal?: string;
  decomposition?: TaskChunk[];
  schedule?: Record<string, { start_min: number; end_min: number; title?: string }>;
}

const DAY_START_HOUR = 8;

function minToTime(min: number): string {
  const h = DAY_START_HOUR + Math.floor(min / 60);
  const m = min % 60;
  return `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const steps = ["goal", "decompose", "blocks", "assign", "calendar"];
const stepLabels = ["Goal", "Decompose", "Blocks", "Assign", "Calendar"];

export function TaskAssignmentViz({
  goal = "Study for math mid-sem",
  decomposition = [],
  schedule = {},
}: TaskAssignmentVizProps) {
  const [step, setStep] = useState(0);
  const currentStep = steps[step];

  const chunks = decomposition.length > 0
    ? decomposition
    : [
        { task_id: "chunk_1", title: "Quantifiers: universal & existential", duration_minutes: 25, difficulty_weight: 0.6 },
        { task_id: "chunk_2", title: "Negation of quantifiers", duration_minutes: 25, difficulty_weight: 0.5 },
        { task_id: "chunk_3", title: "Proof techniques (direct, contrapositive)", duration_minutes: 25, difficulty_weight: 0.7 },
        { task_id: "chunk_4", title: "Basic set theory", duration_minutes: 25, difficulty_weight: 0.5 },
        { task_id: "chunk_5", title: "Flashcard review", duration_minutes: 25, difficulty_weight: 0.3 },
      ];

  const sched = Object.keys(schedule).length > 0 ? schedule : {
    chunk_1: { start_min: 180, end_min: 205, title: "Quantifiers: universal & existential" },
    chunk_2: { start_min: 205, end_min: 230, title: "Negation of quantifiers" },
    chunk_3: { start_min: 270, end_min: 295, title: "Proof techniques (direct, contrapositive)" },
    chunk_4: { start_min: 295, end_min: 320, title: "Basic set theory" },
    chunk_5: { start_min: 360, end_min: 385, title: "Flashcard review" },
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]/90 backdrop-blur-sm p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">How Scheduling Works</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              step === 0
                ? "opacity-50 cursor-not-allowed bg-[var(--border)]"
                : "bg-[var(--border)] hover:bg-[var(--muted)]/30 text-[var(--foreground)]"
            )}
          >
            Prev
          </button>
          <button
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={step === steps.length - 1}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              step === steps.length - 1
                ? "opacity-50 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            )}
          >
            Next
          </button>
        </div>
      </div>

      {/* Step progress indicator */}
      <div className="flex gap-2 mb-6">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === step ? "w-8 bg-emerald-500" : "w-2 bg-[var(--border)] hover:bg-[var(--muted)]/50"
            )}
            aria-label={`Step ${i + 1}: ${stepLabels[i]}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentStep === "goal" && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[var(--muted)] text-sm mb-2">1. Goal input</p>
            <motion.div
              className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ scale: 1.01 }}
            >
              <p className="text-[var(--foreground)] font-medium text-lg">{goal}</p>
            </motion.div>
          </motion.div>
        )}

        {currentStep === "decompose" && (
          <motion.div
            key="decompose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[var(--muted)] text-sm mb-3">2. Socratic decomposition (25-min ceiling)</p>
            <div className="flex flex-wrap gap-3">
              {chunks.map((c, i) => (
                <motion.div
                  key={c.task_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  className="px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm hover:shadow-md cursor-default"
                >
                  <span className="text-[var(--foreground)] font-medium">{c.title}</span>
                  <span className="text-[var(--muted)] ml-2 text-sm">{c.duration_minutes} min</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {currentStep === "blocks" && (
          <motion.div
            key="blocks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[var(--muted)] text-sm mb-3">3. CP-SAT identifies blocks (sleep, hard, soft)</p>
            <div className="space-y-4">
              <div className="flex gap-1 overflow-hidden rounded-lg border border-[var(--border)] p-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "20%" }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="h-12 rounded-md bg-slate-600/60 flex items-center justify-center shrink-0"
                  title="Sleep block - no scheduling"
                >
                  <span className="text-[10px] font-medium text-white/90 px-1 text-center">Sleep</span>
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "25%" }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="h-12 rounded-md bg-amber-500/40 flex items-center justify-center shrink-0"
                  title="Soft block - no heavy work before 11 AM"
                >
                  <span className="text-[10px] font-medium text-amber-900 dark:text-amber-100 px-1 text-center">No work before 11 AM</span>
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "35%" }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="h-12 rounded-md bg-emerald-500/30 flex items-center justify-center shrink-0"
                  title="Available for deep work"
                >
                  <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-200 px-1 text-center">Available</span>
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "20%" }}
                  transition={{ delay: 0.65, duration: 0.5 }}
                  className="h-12 rounded-md bg-slate-600/60 flex items-center justify-center shrink-0"
                  title="Sleep block"
                >
                  <span className="text-[10px] font-medium text-white/90 px-1 text-center">Sleep</span>
                </motion.div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                <span><span className="inline-block w-3 h-3 rounded bg-slate-600/60 mr-1" />Sleep (hard block) – no scheduling</span>
                <span><span className="inline-block w-3 h-3 rounded bg-amber-500/40 mr-1" />Soft block – habit constraint</span>
                <span><span className="inline-block w-3 h-3 rounded bg-emerald-500/30 mr-1" />Available – deep work slots</span>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === "assign" && (
          <motion.div
            key="assign"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[var(--muted)] text-sm mb-3">4. <Abbr term="CP-SAT" /> solver assigns tasks (zero overlaps)</p>
            <p className="text-xs text-[var(--muted)] mb-3">
              TMT prioritization: higher deadline urgency → earlier slot. Sleep and habit blocks excluded.
            </p>
            <div className="space-y-3">
              {Object.entries(sched).map(([tid, slot], i) => (
                <motion.div
                  key={tid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:shadow-md transition-shadow"
                >
                  <span className="text-[var(--foreground)] font-medium flex-1 truncate">{slot.title || tid}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm shrink-0">
                    {minToTime(slot.start_min)} – {minToTime(slot.end_min)}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {currentStep === "calendar" && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[var(--muted)] text-sm mb-3">5. Final calendar</p>
            <motion.div
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]"
              whileHover={{ scale: 1.01 }}
            >
              <p className="text-[var(--foreground)] text-sm mb-3">
                Tasks placed with TMT prioritization. Click Start Task to open workspace.
              </p>
              <Link
                href="/schedule"
                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 text-sm font-medium"
              >
                View full schedule →
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
