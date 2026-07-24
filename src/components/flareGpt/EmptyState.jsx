import { useTranslation } from "react-i18next";
import { SparklesIcon } from "@heroicons/react/24/outline";

import SuggestedPrompts from "@/components/flareGpt/SuggestedPrompts";

// Shown whenever there's no active conversation — greeting and suggested
// prompts. The wallet selector deliberately does *not* also render here:
// the composer directly below (always visible, in both empty and active
// states) already carries it, and showing the same pill twice on one
// screen would be exactly the kind of redundant clutter this page is
// supposed to avoid. "Active wallet visible before a prompt is submitted"
// is satisfied by the composer's pill being on-screen the whole time, not
// by duplicating it. Animates out the moment the first message sends and
// never reappears for that conversation.
export default function EmptyState({ onSelectPrompt, compact = false }) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 overflow-y-auto">
      <div className={`w-full ${compact ? "max-w-sm" : "max-w-2xl"} text-center`}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <SparklesIcon className="h-6 w-6" />
        </div>
        <h2 className={compact ? "text-base font-semibold text-ink-primary" : "text-xl font-semibold text-ink-primary"}>
          {t("flrgpt.empty.title")}
        </h2>
        <p className="mt-1.5 text-sm text-ink-secondary">{t("flrgpt.empty.subtitle")}</p>

        <div className="mt-6 text-left">
          <SuggestedPrompts onSelect={onSelectPrompt} compact={compact} />
        </div>
      </div>
    </div>
  );
}
