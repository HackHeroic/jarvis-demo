"use client";

import { useMode } from "@/lib/modeContext";

export function ModeToggle() {
  const { mode, setMode, isDemoMode } = useMode();
  const demo = isDemoMode();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400">Mode:</span>
      <button
        onClick={() => setMode("demo")}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          demo
            ? "bg-emerald-600 text-white"
            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
        }`}
      >
        Demo
      </button>
      <button
        onClick={() => setMode("live")}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          !demo
            ? "bg-emerald-600 text-white"
            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
        }`}
      >
        Live
      </button>
    </div>
  );
}
