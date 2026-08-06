import { useTranslation } from "react-i18next";

import { useAuthStatus } from "@/hooks/useAuthStatus";

// A single quiet line, not a banner — it sits in the exact slot a signed-in
// user's wallet pill occupies, so guest mode reads as one honest detail
// about this session rather than an interruption competing for attention.
// Only the "sign in" half is styled to invite a click; the rest stays as
// quiet as any other disclaimer already in this composer.
interface GuestModeCaptionProps {
  onOpenWalletModal: () => void;
}

export default function GuestModeCaption({ onOpenWalletModal }: GuestModeCaptionProps) {
  const { t } = useTranslation();
  const { isConnected, isAuthenticating, signIn } = useAuthStatus();

  const handleClick = () => {
    if (!isConnected) {
      onOpenWalletModal();
      return;
    }
    signIn();
  };

  return (
    <p className="px-1 text-[10.5px] leading-relaxed text-ink-muted">
      {t("flrgpt.guestMode.notice")}{" "}
      <button
        type="button"
        onClick={handleClick}
        disabled={isAuthenticating}
        className="font-medium text-brand-text underline-offset-2 hover:underline disabled:opacity-70 cursor-pointer"
      >
        {isAuthenticating ? t("flrgpt.wallet.locked.signingIn") : t("flrgpt.guestMode.cta")}
      </button>
    </p>
  );
}
