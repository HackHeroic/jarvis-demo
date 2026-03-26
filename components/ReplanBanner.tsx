"use client";

interface ReplanBannerProps {
  onReplan: () => void;
  isReplanning?: boolean;
}

export default function ReplanBanner({ onReplan, isReplanning }: ReplanBannerProps) {
  return (
    <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5
                    flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <p className="text-sm text-amber-200">
          Your preferences changed. Replan to apply them to your schedule.
        </p>
      </div>
      <button
        onClick={onReplan}
        disabled={isReplanning}
        className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium
                   bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30
                   text-amber-200 transition-colors disabled:opacity-50"
      >
        {isReplanning ? (
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
            </svg>
            Replanning...
          </span>
        ) : (
          "Replan Schedule"
        )}
      </button>
    </div>
  );
}
