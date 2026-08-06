import { useTranslation } from "react-i18next";

import { SUGGESTED_PROMPTS } from "@/data/flareGptPrompts";

// Only ever shown in the empty state — gone the moment a conversation
// starts, never reappearing for that thread. Cards (icon + label) rather
// than plain text pills, matching the icon-forward language already used
// elsewhere in this dashboard (MetricTile, SupportGrid) instead of
// reading like a generic chatbot's suggestion chips.
interface SuggestedPromptsProps {
  onSelect: (id: string, label: string) => void;
  compact?: boolean;
}

export default function SuggestedPrompts({ onSelect, compact = false }: SuggestedPromptsProps) {
  const { t } = useTranslation();

  return (
    <div className={`grid gap-2.5 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
      {SUGGESTED_PROMPTS.map((prompt) => {
        const Icon = prompt.icon;
        return (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onSelect(prompt.id, t(prompt.titleKey))}
            className="group flex items-center gap-3 rounded-xl bg-surface-inset p-3.5 text-left transition-colors cursor-pointer hover:bg-surface-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-ink-primary">{t(prompt.titleKey)}</p>
          </button>
        );
      })}
    </div>
  );
}
