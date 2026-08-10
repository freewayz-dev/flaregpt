import { useTranslation } from "react-i18next";
import { UserCircleIcon, WalletIcon } from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import { formatVotePowerCompact, type UserParticipation } from "@/pages/Governance/utils/deriveGovernance";

interface YourGovernanceProps {
  hasWallet: boolean;
  votingPower: bigint | undefined;
  isLoadingVotingPower: boolean;
  participation: UserParticipation | undefined;
  onOpenWalletModal: () => void;
}

// Answers "what is my relationship to governance?" — but only ever with
// real, wallet-derived numbers. No wallet (neither connected nor
// watchlisted) means this genuinely has nothing to show, so it's a quiet
// prompt rather than a card full of zeros pretending to be real data.
// Works identically for a watchlist wallet as a connected one — both
// `getVotes` and `hasVoted` are plain address-keyed contract reads, no
// signature or live connection required.
export default function YourGovernance({
  hasWallet,
  votingPower,
  isLoadingVotingPower,
  participation,
  onOpenWalletModal,
}: YourGovernanceProps) {
  const { t } = useTranslation();

  if (!hasWallet) {
    return (
      <WalletEmptyState
        icon={WalletIcon}
        title={t("governance.yours.noWalletTitle")}
        description={t("governance.yours.noWalletDescription")}
        action={
          <button
            type="button"
            onClick={onOpenWalletModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer"
          >
            <WalletIcon className="h-3.5 w-3.5" />
            {t("navbar.connectWallet")}
          </button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {isLoadingVotingPower ? (
        <StatCardSkeleton />
      ) : (
        <StatCard
          title={t("governance.yours.votingPower")}
          value={votingPower !== undefined ? formatVotePowerCompact(votingPower) : "—"}
          icon={UserCircleIcon}
        />
      )}
      <StatCard
        title={t("governance.yours.participation")}
        value={participation ? `${participation.voted}/${participation.total}` : "—"}
        icon={UserCircleIcon}
      />
    </div>
  );
}
