"use client";

import Link from "next/link";
import { ModeToggle } from "./ModeToggle";
import { ThemeToggle } from "./ThemeToggle";

export function LayoutHeader() {
  return (
    <header className="border-b border-[var(--border)] px-4 py-3 bg-[var(--card-bg)]/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
          Jarvis
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/chat" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Chat
          </Link>
          <Link href="/schedule" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Schedule
          </Link>
          <Link href="/architecture" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Architecture
          </Link>
          <Link href="/habits" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Habits
          </Link>
          <div className="pl-4 border-l border-[var(--border)] flex items-center gap-4">
            <ThemeToggle />
            <ModeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
