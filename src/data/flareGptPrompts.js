import {
  WalletIcon,
  GiftIcon,
  Square3Stack3DIcon,
  ScaleIcon,
  ArrowTrendingDownIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

// Suggested prompts shown only in the empty state (gone once a
// conversation starts). `requiresWallet` doesn't disable a prompt when no
// wallet is selected — it just changes which canned response fires (a
// graceful "connect or select a wallet" nudge instead of a fabricated
// analysis). `titleKey` drives the visible button label so these are real,
// translated UI chrome; the canned response bodies below are not (see the
// note on RESPONSES).
// `matchKeywords` is a light, English-only best-effort heuristic so
// free-typed text that resembles a suggestion (rather than clicking it)
// still surfaces the matching canned response instead of always falling
// through to the generic placeholder — not a real intent classifier, just
// enough to make typing feel alive during the placeholder-data phase.
export const SUGGESTED_PROMPTS = [
  { id: "analyzeWallet", icon: WalletIcon, titleKey: "flrgpt.prompts.analyzeWallet", requiresWallet: true, matchKeywords: ["analyze", "wallet"] },
  { id: "increaseRewards", icon: GiftIcon, titleKey: "flrgpt.prompts.increaseRewards", requiresWallet: false, matchKeywords: ["increase"] },
  { id: "explainDelegations", icon: Square3Stack3DIcon, titleKey: "flrgpt.prompts.explainDelegations", requiresWallet: true, matchKeywords: ["delegation"] },
  { id: "compareProtocols", icon: ScaleIcon, titleKey: "flrgpt.prompts.compareProtocols", requiresWallet: false, matchKeywords: ["sceptre", "firelight", "compare"] },
  { id: "rewardsDecreased", icon: ArrowTrendingDownIcon, titleKey: "flrgpt.prompts.rewardsDecreased", requiresWallet: true, matchKeywords: ["decrease", "dropped", "lower"] },
  { id: "stakingOpportunities", icon: RocketLaunchIcon, titleKey: "flrgpt.prompts.stakingOpportunities", requiresWallet: false, matchKeywords: ["staking", "stake", "opportunities"] },
];

export function matchPromptId(text) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;
  const match = SUGGESTED_PROMPTS.find((p) =>
    p.matchKeywords.some((kw) => normalized.includes(kw)),
  );
  return match?.id ?? null;
}

// Canned placeholder response bodies — deliberately left untranslated and
// out of the i18n pipeline. Unlike the rest of this app's user-facing
// copy, this text has no long-term life: it exists only to demonstrate
// layout (markdown, tables, badges, charts) until the real FlareGPT API
// exists, at which point it's replaced wholesale rather than edited in
// place. Translating throwaway placeholder paragraphs into 15 locales
// would be real, wasted effort for content that ships with an expiry
// date — everything actually staying in the product (prompt labels,
// composer, empty state, history panel) is fully translated as normal.
//
// Each response is an array of typed blocks rather than one markdown
// string: `text` blocks render as markdown (headings, lists, tables,
// bold — react-markdown + remark-gfm handles tables natively, so
// comparisons don't need a bespoke table block), while `walletBadge`,
// `tokenBadges`, and `chart` are things markdown can't express and get
// their own small dedicated components. A real streaming API would very
// plausibly emit something shaped like this (text interleaved with
// structured references) rather than one flat string.
function fallbackNoWalletResponse() {
  return [
    {
      type: "text",
      markdown:
        "I don't see a wallet selected yet. Connect your wallet or choose one from your watchlist using the selector above, and I'll personalize this answer to it.",
    },
  ];
}

const RESPONSES = {
  analyzeWallet: (wallet) => {
    if (!wallet) return fallbackNoWalletResponse();
    return [
      { type: "text", markdown: "Here's a snapshot of what's currently in this wallet:" },
      { type: "walletBadge", address: wallet.address },
      { type: "tokenBadges", symbols: ["FLR", "SGB", "SFLR"] },
      {
        type: "text",
        markdown:
          "Your largest position is **FLR** at roughly 65% of tracked value, with **sFLR** making up most of the rest through Sceptre's liquid staking. Nothing here looks unusual — no idle balances above 1,000 FLR sitting unstaked.\n\n- 3 active FTSO delegations\n- 1 liquid-staking position (Sceptre)\n- No pending unclaimed rewards detected",
      },
    ];
  },

  increaseRewards: () => [
    {
      type: "text",
      markdown:
        "A few levers that typically move FTSO reward rates the most:\n\n1. **Delegate to higher-performing providers** — reward rates vary meaningfully between data providers based on their FTSO accuracy.\n2. **Avoid frequent re-delegation** — rewards are epoch-based, and switching mid-epoch can forfeit that epoch's accrual.\n3. **Consider liquid staking** (Sceptre or Firelight) if you want rewards to compound automatically rather than claiming manually.\n\nIf you select a wallet, I can point to which of these would move the needle most for your specific delegations.",
    },
  ],

  explainDelegations: (wallet) => {
    if (!wallet) return fallbackNoWalletResponse();
    return [
      { type: "text", markdown: "This wallet currently has 3 active FTSO delegations:" },
      {
        type: "text",
        markdown:
          "| Provider | Share | Est. APY |\n| --- | --- | --- |\n| Flare Oracle Co. | 45% | 6.8% |\n| Songbird Signal | 35% | 6.4% |\n| Ftso.au | 20% | 6.1% |",
      },
      {
        type: "text",
        markdown:
          "This is a reasonably diversified split — no single provider holds a majority, which limits your exposure if one underperforms an epoch.",
      },
    ];
  },

  compareProtocols: () => [
    {
      type: "text",
      markdown:
        "Sceptre and Firelight solve slightly different problems — here's the shape of the tradeoff:",
    },
    {
      type: "text",
      markdown:
        "| | Sceptre (sFLR) | Firelight |\n| --- | --- | --- |\n| Model | Liquid staking | Insured vault |\n| Liquidity | Tradeable anytime | No lock-up |\n| Yield | Native staking + DeFi | Native staking, capital-protected |\n| Best for | Maximizing composability | Minimizing downside risk |",
    },
    {
      type: "text",
      markdown:
        "If you want your staked position to stay usable elsewhere in DeFi, Sceptre's liquid token is the better fit. If capital preservation matters more than flexibility, Firelight's insurance model trades some upside for a smoother ride.",
    },
  ],

  rewardsDecreased: (wallet) => {
    if (!wallet) return fallbackNoWalletResponse();
    return [
      { type: "text", markdown: "Your estimated weekly rewards dipped about 15% over the last 4 weeks:" },
      {
        type: "chart",
        trend: "down",
        caption: "Estimated weekly FTSO rewards (FLR)",
        points: [
          { label: "W1", value: 142 },
          { label: "W2", value: 138 },
          { label: "W3", value: 129 },
          { label: "W4", value: 121 },
        ],
      },
      {
        type: "text",
        markdown:
          "The drop tracks closely with a network-wide reward-rate decline this period, not anything specific to your delegations — reward rates move with total participation across the network, so this is likely temporary rather than something to react to.",
      },
    ];
  },

  stakingOpportunities: () => [
    {
      type: "text",
      markdown: "A few staking options worth knowing about right now:",
    },
    {
      type: "text",
      markdown:
        "- **Native P-Chain validator staking** — 11.5% APR, 14-day lock-up, highest yield tier\n- **Sceptre liquid staking (sFLR)** — 8.8% APR, no lock-up, stays usable in DeFi\n- **Wrap & delegate (WFLR)** — 7.5% APR, fully liquid, lowest commitment",
    },
    { type: "tokenBadges", symbols: ["FLR", "SFLR", "WFLR"] },
    {
      type: "text",
      markdown:
        "Select a wallet and I can factor in your current holdings to suggest which of these fits best.",
    },
  ],
};

const GENERIC_FALLBACK = () => [
  {
    type: "text",
    markdown:
      "FlareGPT's live analysis engine isn't connected yet — once it is, this will be answered using real on-chain and portfolio data. This is a placeholder response so the conversation layout can be reviewed ahead of that.",
  },
];

export function getPlaceholderResponse(promptId, wallet) {
  const generator = RESPONSES[promptId];
  return generator ? generator(wallet) : GENERIC_FALLBACK();
}
