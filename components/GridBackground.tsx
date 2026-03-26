"use client";

import { cn } from "@/lib/utils";

interface GridBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

/** Grid pattern background - Alice/Aceternity style. Adapts to light/dark via theme. */
export function GridBackground({ className, children }: GridBackgroundProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
        "bg-[var(--background)]",
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />
      {children}
    </div>
  );
}
