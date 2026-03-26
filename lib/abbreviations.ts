/**
 * Abbreviation definitions for technical terms used across the Jarvis UI.
 * Used for <abbr> tooltips to improve accessibility and clarity.
 */

export const ABBREVIATIONS = {
  "CP-SAT":
    "Constraint Programming – Satisfiability. Google OR-Tools solver that mathematically guarantees zero-overlap schedules.",
  WOOP: "Wish, Outcome, Obstacle, Plan. Psychological framework for goal pursuit with implementation intentions.",
} as const;

export type AbbrTerm = keyof typeof ABBREVIATIONS;
