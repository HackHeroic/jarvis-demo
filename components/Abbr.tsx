"use client";

import { ABBREVIATIONS, type AbbrTerm } from "@/lib/abbreviations";
import { cn } from "@/lib/utils";

interface AbbrProps {
  term: AbbrTerm;
  className?: string;
}

/** Inline abbreviation with tooltip. Use for static text. */
export function Abbr({ term, className }: AbbrProps) {
  const title = ABBREVIATIONS[term];
  return (
    <abbr
      title={title}
      className={cn("cursor-help border-b border-dotted border-[var(--muted)]", className)}
    >
      {term}
    </abbr>
  );
}
