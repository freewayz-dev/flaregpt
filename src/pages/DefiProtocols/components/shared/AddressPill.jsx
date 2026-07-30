import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

import { shortenAddress } from "@/utils/address";

export default function AddressPill({ label, address }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success(t("defiProtocols.common.addressCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("defiProtocols.common.copyFailed"));
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-inset px-3 py-2.5">
      <span className="text-xs text-ink-muted shrink-0">{label}</span>
      <button
        type="button"
        onClick={handleCopy}
        title={address}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-ink-primary hover:bg-surface-card-hover hover:text-brand transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        <span className="font-mono tracking-tight">{shortenAddress(address)}</span>
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        ) : (
          <ClipboardIcon className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>
    </div>
  );
}
