"use client";

import { useState } from "react";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import {
  ARCHITECTURE_DIAGRAMS,
  DIAGRAM_CATEGORIES,
  type DiagramDef,
} from "@/lib/architectureDiagrams";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export function ArchitectureDiagram() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set([ARCHITECTURE_DIAGRAMS.find((d) => d.id === "current-overview")?.id ?? ""])
  );

  const diagramsByCategory = DIAGRAM_CATEGORIES.map((cat) => ({
    ...cat,
    diagrams: ARCHITECTURE_DIAGRAMS.filter((d) => d.category === cat.id),
  }));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-12">
      {/* Category tabs / nav */}
      <nav className="flex flex-wrap gap-2">
        {DIAGRAM_CATEGORIES.map((cat) => {
          const count = ARCHITECTURE_DIAGRAMS.filter(
            (d) => d.category === cat.id
          ).length;
          if (count === 0) return null;
          const isActive = activeCategory === cat.id || activeCategory === null;
          return (
            <button
              key={cat.id}
              onClick={() =>
                setActiveCategory(isActive && activeCategory === cat.id ? null : cat.id)
              }
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--card-bg)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]/50"
              )}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </nav>

      {/* Diagram sections by category */}
      {diagramsByCategory.map(({ id: catId, label, diagrams }) => {
        if (diagrams.length === 0) return null;
        const show =
          activeCategory === null || activeCategory === catId;
        if (!show) return null;

        return (
          <motion.section
            key={catId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              {label}
            </h2>
            <div className="space-y-8">
              {diagrams.map((diagram) => (
                <DiagramCard
                  key={diagram.id}
                  diagram={diagram}
                  isExpanded={expandedIds.has(diagram.id)}
                  onToggleExpand={() => toggleExpand(diagram.id)}
                />
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}

function DiagramCard({
  diagram,
  isExpanded,
  onToggleExpand,
}: {
  diagram: DiagramDef;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]/80 overflow-hidden shadow-sm">
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--border)]/20 transition-colors"
      >
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">
            {diagram.title}
          </h3>
          {diagram.description && (
            <p className="text-sm text-[var(--muted)] mt-0.5">
              {diagram.description}
            </p>
          )}
        </div>
        <svg
          className={cn(
            "w-5 h-5 text-[var(--muted)] transition-transform",
            isExpanded && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <MermaidDiagram
                id={diagram.id}
                mermaid={diagram.mermaid}
                title={undefined}
                description={undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
