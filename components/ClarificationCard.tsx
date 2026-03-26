"use client";

interface ClarificationCardProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export default function ClarificationCard({
  options,
  onSelect,
  disabled,
}: ClarificationCardProps) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider">
        Quick replies
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            disabled={disabled}
            className="px-4 py-2 rounded-xl text-sm
                       border border-[var(--border)] bg-[var(--card-bg)]
                       hover:border-emerald-500/40 hover:bg-emerald-500/5
                       active:scale-[0.98] transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
