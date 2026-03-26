"use client";

import { Fragment } from "react";
import { ABBREVIATIONS } from "@/lib/abbreviations";
import { cn } from "@/lib/utils";

interface TextWithAbbrProps {
  text: string;
  className?: string;
}

/**
 * Renders text with known abbreviations (CP-SAT, WOOP) wrapped in <abbr> for tooltips.
 * Preserves whitespace and line breaks.
 */
export function TextWithAbbr({ text, className }: TextWithAbbrProps) {
  const terms = Object.keys(ABBREVIATIONS) as (keyof typeof ABBREVIATIONS)[];
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliest = -1;
    let matchedTerm: keyof typeof ABBREVIATIONS | null = null;

    for (const term of terms) {
      const idx = remaining.indexOf(term);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        matchedTerm = term;
      }
    }

    if (earliest === -1 || !matchedTerm) {
      parts.push(remaining);
      break;
    }

    if (earliest > 0) {
      parts.push(remaining.slice(0, earliest));
    }
    parts.push(
      <abbr
        key={key++}
        title={ABBREVIATIONS[matchedTerm]}
        className={cn("cursor-help border-b border-dotted border-[var(--muted)]")}
      >
        {matchedTerm}
      </abbr>
    );
    remaining = remaining.slice(earliest + matchedTerm.length);
  }

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {parts.map((p, i) => (
        <span key={i}>{p}</span>
      ))}
    </span>
  );
}
