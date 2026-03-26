"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface StudyAsset {
  asset_type: string;
  title: string;
  content_or_url: string;
  rationale?: string;
}

interface WorkspaceViewProps {
  taskId: string;
  taskTitle: string;
  primaryObjective: string;
  surfacedAssets: StudyAsset[];
}

function AssetIcon({ type }: { type: string }) {
  if (type.includes("youtube")) {
    return (
      <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );
  }
  if (type.includes("article") || type.includes("link")) {
    return (
      <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    );
  }
  if (type.includes("quiz")) {
    return (
      <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    </div>
  );
}

export function WorkspaceView({
  taskId,
  taskTitle,
  primaryObjective,
  surfacedAssets,
}: WorkspaceViewProps) {
  return (
    <div className="space-y-8">
      <Link
        href="/schedule"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to schedule
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight">
          {taskTitle}
        </h1>
        <p className="text-[var(--muted)] text-base leading-relaxed max-w-2xl">
          {primaryObjective}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Surfaced Assets</h2>
        <div className="space-y-4">
          {surfacedAssets.map((asset, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border border-[var(--border)] p-5",
                "bg-[var(--card-bg)] shadow-sm",
                "hover:shadow-md hover:border-[var(--accent)]/30",
                "transition-all duration-200"
              )}
            >
              <div className="flex gap-4">
                <AssetIcon type={asset.asset_type} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={cn(
                        "text-xs font-medium px-2.5 py-1 rounded-md",
                        "bg-[var(--border)]/50 text-[var(--muted)]"
                      )}
                    >
                      {asset.asset_type.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">{asset.title}</span>
                  </div>
                  {asset.asset_type.includes("link") ? (
                    <a
                      href={asset.content_or_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[var(--accent)] hover:underline",
                        "break-all text-sm font-medium"
                      )}
                    >
                      {asset.content_or_url}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <div className="text-[var(--foreground)] text-sm leading-relaxed whitespace-pre-wrap">
                      {asset.content_or_url}
                    </div>
                  )}
                  {asset.rationale && (
                    <p className="text-[var(--muted)] text-xs mt-3 italic">
                      {asset.rationale}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
