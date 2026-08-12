import {
  WalletIcon,
  GiftIcon,
  Square3Stack3DIcon,
  ScaleIcon,
  ArrowTrendingDownIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

// Suggested prompts shown only in the empty state (gone once a
// conversation starts). `titleKey` drives the visible button label — real,
// translated UI chrome, unlike the actual reply text, which now comes from
// the real FlareGPT API (see chatService.js / chatSocket.js) rather than
// anything defined here.
export const SUGGESTED_PROMPTS = [
  { id: "analyzeWallet", icon: WalletIcon, titleKey: "flrgpt.prompts.analyzeWallet" },
  { id: "increaseRewards", icon: GiftIcon, titleKey: "flrgpt.prompts.increaseRewards" },
  { id: "explainDelegations", icon: Square3Stack3DIcon, titleKey: "flrgpt.prompts.explainDelegations" },
  { id: "compareProtocols", icon: ScaleIcon, titleKey: "flrgpt.prompts.compareProtocols" },
  { id: "rewardsDecreased", icon: ArrowTrendingDownIcon, titleKey: "flrgpt.prompts.rewardsDecreased" },
  { id: "stakingOpportunities", icon: RocketLaunchIcon, titleKey: "flrgpt.prompts.stakingOpportunities" },
];
