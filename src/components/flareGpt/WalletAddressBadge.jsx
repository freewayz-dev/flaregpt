import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { WalletIcon, ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

import { shortenAddress, copyWalletAddress } from "@/utils/address";

// A compact inline reference — for when an assistant response points at a
// specific wallet address — rather than raw plain text, so responses stay
// scannable and visually tie into the same address-pill language used on
// the DeFi page (AddressPill) instead of reading like generic markdown.


export default function WalletAddressBadge({ address }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyWalletAddress(address);
    if (success) {
      setCopied(true);
      toast.success(t("navbar.addressCopied"));
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t("navbar.copyFailed"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={address}
      className="inline-flex items-center gap-1.5 rounded-lg bg-surface-inset px-2.5 py-1.5 text-xs font-medium text-ink-primary hover:bg-surface-card-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
    >
      <WalletIcon className="h-3.5 w-3.5 text-ink-muted shrink-0" />
      <span className="font-mono tracking-tight">{shortenAddress(address)}</span>
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <ClipboardIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
      )}
    </button>
  );
}
