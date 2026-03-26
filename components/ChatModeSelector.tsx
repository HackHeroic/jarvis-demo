"use client";

interface ChatModeSelectorProps {
  mode: "pipeline" | "lmstudio";
  onModeChange: (mode: "pipeline" | "lmstudio") => void;
}

export function ChatModeSelector({ mode, onModeChange }: ChatModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] w-fit">
      <button
        type="button"
        onClick={() => onModeChange("pipeline")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mode === "pipeline"
            ? "bg-[var(--accent)] text-white"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        Jarvis Pipeline
      </button>
      <button
        type="button"
        onClick={() => onModeChange("lmstudio")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mode === "lmstudio"
            ? "bg-[var(--accent)] text-white"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        LM Studio Direct
      </button>
    </div>
  );
}
