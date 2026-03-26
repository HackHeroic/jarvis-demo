"use client";

import { Abbr } from "@/components/Abbr";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { ARCHITECTURE_DIAGRAMS } from "@/lib/architectureDiagrams";
import { motion } from "motion/react";

export default function ArchitecturePage() {
  const overviewDiagram = ARCHITECTURE_DIAGRAMS.find((d) => d.id === "current-overview");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-12"
        >
          <h1 className="text-3xl font-bold mb-2">How Jarvis Works</h1>
          <p className="text-[var(--muted)] text-lg max-w-2xl">
            Under the hood, Jarvis is a production-ready 9-layer agentic stack. Explore each component below.
          </p>
        </motion.div>

        {/* Hero overview diagram - always visible */}
        {overviewDiagram && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-16"
          >
            <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
              High-Level Overview
            </h2>
            <MermaidDiagram
              id={overviewDiagram.id}
              mermaid={overviewDiagram.mermaid}
              title={overviewDiagram.title}
              description={overviewDiagram.description}
              className="shadow-lg"
            />
          </motion.section>
        )}

        {/* All diagrams by category */}
        <section>
          <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">
            All Architecture Diagrams
          </h2>
          <p className="text-[var(--muted)] mb-8 max-w-2xl">
            Expand any diagram to view details. Use zoom controls or open in{" "}
            <a
              href="https://mermaid.live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              Mermaid Live Editor
            </a>{" "}
            for interactive zoom and export.
          </p>
          <ArchitectureDiagram />
        </section>

        {/* Component Definitions */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-16"
        >
          <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
            Component Definitions
          </h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]/50">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)]">Component</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)]">Definition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">Control Policy</td><td className="py-3 px-4 text-[var(--muted)]">Master orchestrator for /chat: brain-dump extraction, multi-intent execution, plan-day flow, ingestion routing.</td></tr>
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">LiteLLM Router</td><td className="py-3 px-4 text-[var(--muted)]">Local-first: Qwen 27B (decompose), Qwen 4B (router), Gemini (L9 search).</td></tr>
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">Habit Translator</td><td className="py-3 px-4 text-[var(--muted)]">Converts natural-language constraints (behavioral_constraints) to SemanticTimeSlots.</td></tr>
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">Socratic Chunker</td><td className="py-3 px-4 text-[var(--muted)]">Decomposes goals into TaskChunks (25-min ceiling) via LLM.</td></tr>
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">CSP Solver</td><td className="py-3 px-4 text-[var(--muted)]">OR-Tools <Abbr term="CP-SAT" />: fits tasks into calendar slots with TMT priorities, AddNoOverlap, dependencies.</td></tr>
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">Adaptive Pacing</td><td className="py-3 px-4 text-[var(--muted)]">compute_adaptive_daily_cap: slack-ratio-driven daily cap; prevents cramming.</td></tr>
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">ChromaDB</td><td className="py-3 px-4 text-[var(--muted)]">Vector store for ingested knowledge; task_materials links to user_tasks.</td></tr>
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">Docling</td><td className="py-3 px-4 text-[var(--muted)]">IBM Docling: handles unstructured materials and preserves semantic structure (L6 Extraction).</td></tr>
                  <tr><td className="py-3 px-4 font-medium text-[var(--foreground)]">Workspace Builder</td><td className="py-3 px-4 text-[var(--muted)]">Fetches RAG chunks, learning-style web search, dynamic practice assets for task focus mode.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
