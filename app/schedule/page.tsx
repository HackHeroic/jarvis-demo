"use client";

import { useState, useEffect } from "react";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { TaskAssignmentViz } from "@/components/TaskAssignmentViz";
import { getDemoSchedule, getDemoExecutionGraph } from "@/lib/demoData";
import { isDemoMode } from "@/lib/api";
import { loadLastChatResponse } from "@/lib/scheduleStore";
import { motion } from "motion/react";

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<Record<string, { start_min: number; end_min: number; title?: string }>>({});
  const [executionGraph, setExecutionGraph] = useState<any>(null);
  const [horizonStart, setHorizonStart] = useState<string | undefined>(undefined);
  const [showViz, setShowViz] = useState(true);

  useEffect(() => {
    const stored = loadLastChatResponse();
    if (stored?.schedule) {
      const rawSchedule = stored.schedule.schedule;
      const graph = stored.execution_graph;
      // Merge titles: prefer backend title, fallback to execution_graph decomposition, then humanized ID
      const titleMap = Object.fromEntries(
        (graph?.decomposition ?? []).map((t: { task_id: string; title: string }) => [t.task_id, t.title])
      );
      const enriched = Object.fromEntries(
        Object.entries(rawSchedule).map(([id, slot]) => [
          id,
          { ...slot, title: (slot as any).title ?? titleMap[id] ?? id.replace(/_/g, " ") },
        ])
      );
      setSchedule(enriched);
      setExecutionGraph(graph ?? null);
      setHorizonStart(stored.schedule.horizon_start ?? undefined);
    } else if (isDemoMode()) {
      setSchedule(getDemoSchedule());
      setExecutionGraph(getDemoExecutionGraph());
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-md p-8 shadow-xl"
        >
          <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">
            Your Schedule
          </h1>

          {showViz && executionGraph && Object.keys(schedule).length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mb-12"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  How scheduling works
                </h2>
                <button
                  onClick={() => setShowViz(false)}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  Hide
                </button>
              </div>
              <TaskAssignmentViz
                decomposition={executionGraph?.decomposition ?? []}
                schedule={schedule}
                goal="Study for my math mid-sem"
              />
            </motion.section>
          )}

          {!showViz && (
            <button
              onClick={() => setShowViz(true)}
              className="text-sm text-[var(--accent)] hover:opacity-80 mb-4 transition-opacity"
            >
              Show how scheduling works
            </button>
          )}

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
              Calendar
            </h2>
            <ScheduleCalendar schedule={schedule} horizonStart={horizonStart} />
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}
