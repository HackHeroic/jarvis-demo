"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type DemoMode = "demo" | "live";

const MODE_KEY = "jarvis-demo-mode";

interface ModeContextType {
  mode: DemoMode;
  setMode: (m: DemoMode) => void;
  isDemoMode: () => boolean;
}

const ModeContext = createContext<ModeContextType | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DemoMode>("demo");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(MODE_KEY) as DemoMode | null;
    if (stored === "demo" || stored === "live") {
      setModeState(stored);
    } else {
      // First visit: persist "demo" so isDemoMode() in api.ts also works
      localStorage.setItem(MODE_KEY, "demo");
    }
    setMounted(true);
  }, []);

  const setMode = (m: DemoMode) => {
    setModeState(m);
    if (typeof window !== "undefined") localStorage.setItem(MODE_KEY, m);
  };

  const isDemoMode = () => mode === "demo";

  if (!mounted) return null;

  return (
    <ModeContext.Provider value={{ mode, setMode, isDemoMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
