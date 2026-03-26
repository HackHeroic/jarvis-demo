"use client";

import { useState } from "react";

interface CollapsibleProps {
  label: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function Collapsible({ label, defaultExpanded = false, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1 w-full text-left"
      >
        <span>{open ? "\u25BC" : "\u25B6"}</span>
        <span>{label}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
