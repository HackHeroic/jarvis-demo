"use client";

import { cn } from "@/lib/utils";

interface DotPatternProps {
  className?: string;
  children?: React.ReactNode;
}

/** Dot pattern background - subtle dots that adapt to light/dark. */
export function DotPattern({ className, children }: DotPatternProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
        "bg-[var(--bg)]",
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.2]"
        style={{
          backgroundImage: `radial-gradient(circle at center, var(--grid-line) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      {children}
    </div>
  );
}
