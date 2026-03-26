"use client";

import { useState } from "react";
import Link from "next/link";
import { useMode } from "@/lib/modeContext";
import { chat } from "@/lib/api";
import { MOCK_CHAT_RESPONSE_BEHAVIORAL } from "@/lib/demoData";

export default function HabitsPage() {
  const { isDemoMode } = useMode();
  const [habit, setHabit] = useState("");
  const [result, setResult] = useState<{ message: string; suggestedAction?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddHabit = async () => {
    if (!habit.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await chat({
        user_prompt: habit,
        user_id: "demo",
      });
      setResult({
        message: res.message,
        suggestedAction: res.suggested_action ?? undefined,
      });
    } catch (e) {
      setResult({ message: `Error: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const demoHabit = "I hate mornings, never schedule work before 11 AM";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">Habits & Preferences</h1>
        <p className="text-[var(--muted)] mb-8">
          Add behavioral constraints. Jarvis will apply them to your schedule.
        </p>

        <div className="space-y-4">
          <textarea
            value={habit}
            onChange={(e) => setHabit(e.target.value)}
            placeholder="e.g. I hate mornings, no heavy work before 11 AM"
            className="w-full h-24 px-4 py-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <div className="flex gap-4">
            <button
              onClick={handleAddHabit}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium"
            >
              {loading ? "Saving..." : "Add Habit"}
            </button>
            <button
              onClick={() => {
                setHabit(demoHabit);
                if (isDemoMode()) {
                  setResult({
                    message: MOCK_CHAT_RESPONSE_BEHAVIORAL.message,
                    suggestedAction: MOCK_CHAT_RESPONSE_BEHAVIORAL.suggested_action ?? undefined,
                  });
                }
              }}
              className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--border)]/30"
            >
              Use demo: &quot;I hate mornings&quot;
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-8 p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--border)]">
            <p className="text-[var(--foreground)]">{result.message}</p>
            {result.suggestedAction === "replan" && (
              <p className="mt-2 text-sm text-emerald-400">
                Your schedule constraints have been updated.{" "}
                <Link href="/chat" className="underline">
                  Regenerate your schedule
                </Link>{" "}
                to apply them.
              </p>
            )}
          </div>
        )}

        <div className="mt-12 p-4 rounded-lg bg-[var(--card-bg)]/50 border border-[var(--border)]">
          <h2 className="font-medium mb-2 text-[var(--foreground)]">Example habits</h2>
          <ul className="text-sm text-[var(--muted)] space-y-1">
            <li>• I hate mornings, never schedule work before 11 AM</li>
            <li>• No heavy programming before noon</li>
            <li>• I have a meeting 2–3 PM every day</li>
            <li>• I work best in the evening</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
