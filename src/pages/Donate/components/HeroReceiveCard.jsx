import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import TokenIcon from "@/components/common/TokenIcon";

// The one "receive" moment the whole page exists for — full address (never
// truncated, unlike the DeFi page's AddressPill convention, since this one
// is an actual send target rather than a reference contract address), a
// client-side QR (qrcode.react — no network call, the address never leaves
// the browser to become an image), and two independent ways to copy it,
// exactly as specced: the dedicated button and the address block itself.
//
// Takes the selected `coin` object (from DONATION_COINS) as a prop rather
// than reading a single hardcoded address, so switching coins in the
// parent's <CoinSelector> re-renders this with new content. The `layout`
// prop on the outer card lets framer-motion smoothly animate any height
// difference between coins (addresses vary in length), and the inner
// content cross-fades on `coin.id` via AnimatePresence instead of
// snapping, so a coin switch never feels like a page reload.
export default function HeroReceiveCard({ coin }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Without this, copying FLR then switching to BTC within the 2s window
  // would show BTC's button as "Copied" even though its address was never
  // actually copied — the button's state must reset with the coin it's
  // showing, not persist across a switch.
  useEffect(() => {
    setCopied(false);
  }, [coin.id]);

  const explorerUrl = coin.explorerUrl(coin.address);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coin.address);
      setCopied(true);
      toast.success(t("donate.hero.addressCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("donate.hero.copyFailed"));
    }
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="rounded-2xl bg-surface-card p-6 shadow-sm border border-[#E5E7EB] dark:border-none sm:p-8"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={coin.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          className="flex flex-col gap-8 lg:flex-row lg:items-center"
        >
          <div className="flex shrink-0 justify-center lg:justify-start">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeSVG
                value={coin.address}
                size={168}
                level="M"
                marginSize={0}
                title={t("donate.hero.qrTitle", { symbol: coin.symbol })}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-slate-500 dark:border-none dark:bg-[#191A1F] dark:text-[#6D7A86]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-wide">
                  {coin.network}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-inset px-2.5 py-1">
                <TokenIcon symbol={coin.symbol} size={13} />
                <span className="text-[9px] font-bold uppercase tracking-wide text-ink-secondary">
                  {coin.symbol}
                </span>
              </span>
            </div>

            <p className="mt-5 text-xs text-ink-muted">
              {t("donate.hero.addressLabel")}
            </p>
            <div
              onClick={handleCopy}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCopy();
                }
              }}
              role="button"
              tabIndex={0}
              title={t("donate.hero.tapToCopy")}
              className="mt-1.5 cursor-pointer rounded-xl bg-surface-inset px-4 py-3.5 transition-colors hover:bg-surface-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
            >
              <p className="select-all break-all font-mono text-sm tracking-wide text-ink-primary sm:text-base">
                {coin.address}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors cursor-pointer hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <ClipboardIcon className="h-4 w-4" />
                )}
                {copied ? t("donate.hero.copied") : t("donate.hero.copyAddress")}
              </button>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-5 py-3 text-sm font-medium text-ink-secondary transition-colors cursor-pointer hover:bg-surface-card-hover hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {t("donate.hero.viewOnExplorer", { explorer: coin.explorerName })}
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </a>
            </div>

            {coin.isMultisig && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-muted">
                <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {t("donate.hero.multisigNote")}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
