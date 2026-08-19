import { useTranslation } from "react-i18next";
import { GlobeAltIcon, DocumentTextIcon, ChatBubbleLeftRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

import LinkLogo from "@/pages/Links/components/LinkLogo";
import XLogo from "@/components/common/XLogo";
import { humanizeCategory, cleanDescription } from "@/pages/Links/utils/filterLinks";

// Text-labeled action pills for Website/Docs/Discord — an icon alone isn't
// self-explanatory until you hover it. X is the one exception: its own
// logo mark already unambiguously means "X", so a redundant "X" caption
// next to it would just repeat what the icon already says — `iconOnly`
// drops the visible label there while still keeping it as the accessible
// name (aria-label/title) for anyone not seeing the icon.
function LinkAction({ href, label, Icon, iconOnly = false }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={iconOnly ? label : undefined}
      className={`inline-flex items-center gap-1 rounded-lg bg-surface-inset text-[11px] font-medium text-ink-secondary transition-colors hover:bg-surface-card-hover hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
        iconOnly ? "p-1.5" : "px-2.5 py-1.5"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {!iconOnly && label}
    </a>
  );
}

export default function LinkCard({ link }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <LinkLogo id={link.id} name={link.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-primary">{link.name}</h3>
            {link.category && (
              <span className="shrink-0 rounded-full bg-surface-inset px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                {humanizeCategory(link.category)}
              </span>
            )}
          </div>
        </div>
      </div>

      {link.description && (
        <p className="text-xs text-ink-secondary leading-relaxed flex-1">{cleanDescription(link.description)}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <LinkAction href={link.official_site} label={t("links.card.website")} Icon={GlobeAltIcon} />
        <LinkAction href={link.docs_url} label={t("links.card.docs")} Icon={DocumentTextIcon} />
        <LinkAction href={link.twitter} label={t("links.card.twitter")} Icon={XLogo} iconOnly />
        <LinkAction href={link.discord} label={t("links.card.discord")} Icon={ChatBubbleLeftRightIcon} />
      </div>

      {link.verified_at && (
        <div className="flex items-center gap-1 text-[11px] text-ink-muted">
          <ShieldCheckIcon className="h-3 w-3" />
          {t("links.card.verifiedOn", { date: link.verified_at })}
        </div>
      )}
    </div>
  );
}
