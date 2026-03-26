"use client";

import { ModeProvider } from "@/lib/modeContext";
import { ThemeProvider } from "@/lib/themeContext";
import { LayoutHeader } from "@/components/LayoutHeader";
import { GridBackground } from "@/components/GridBackground";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ModeProvider>
        <GridBackground className="fixed inset-0 -z-10" />
        <LayoutHeader />
        {children}
      </ModeProvider>
    </ThemeProvider>
  );
}
