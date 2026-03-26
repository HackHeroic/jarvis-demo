"use client";

import { useState } from "react";
import { TextWithAbbr } from "@/components/TextWithAbbr";

interface ThinkingProcessProps {
  text: string;
}

export function ThinkingProcess({ text }: ThinkingProcessProps) {
  const [expanded, setExpanded] = useState(true); // Expanded by default so thinking is visible in both demo and live
  if (!text?.trim()) return null;
  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1"
      >
        {expanded ? "▼" : "▶"} Jarvis&apos;s reasoning
      </button>
      {expanded && (
        <div className="mt-2 text-xs text-[var(--muted)] whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
          <TextWithAbbr text={text} />
        </div>
      )}
    </div>
  );
}
