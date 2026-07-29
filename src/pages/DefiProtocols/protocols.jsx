import MxrpyIcon from "@/assets/protocols/mxrpy.svg";
import SceptreIcon from "@/assets/protocols/sceptre.svg";

import { useUIStore } from "@/store/useUIStore";
import {
  useMxrpyVault,
  useSceptreVault,
  useFirelightVault,
  useSpectraVault,
} from "@/hooks/queries/useDefiProtocolsQueries";
import MxrpyDetail from "@/pages/DefiProtocols/components/details/MxrpyDetail";
import SceptreDetail from "@/pages/DefiProtocols/components/details/SceptreDetail";
import FirelightDetail from "@/pages/DefiProtocols/components/details/FirelightDetail";
import SpectraDetail from "@/pages/DefiProtocols/components/details/SpectraDetail";
import FirelightIcon from "@/pages/DefiProtocols/components/shared/FirelightIcon";
import SpectraIcon from "@/pages/DefiProtocols/components/shared/SpectraIcon";

// Single source of truth for "what protocols does this page show" — adding
// Clearpool/Spectra/Morpho later means adding one entry here (icon, hook,
// balance getter, detail component) rather than a new card layout. The list
// rail, mobile accordion, and KPI row all read from this array, so none of
// them need to change shape as protocols are added.
export const PROTOCOLS = [
  {
    id: "mxrpy",
    icon: MxrpyIcon,
    titleKey: "defiProtocols.mxrpy.title",
    subtitleKey: "defiProtocols.mxrpy.subtitle",
    categoryKey: "defiProtocols.mxrpy.category",
    useVault: useMxrpyVault,
    hasData: (data) => Boolean(data?.global_metrics && data?.user_portfolio),
    getBalance: (data) => ({
      amount: data?.user_portfolio?.receipt_shares ?? 0,
      unit: data?.token_symbol ?? "",
    }),
    getBadge: () => null,
    DetailComponent: MxrpyDetail,
  },
  {
    id: "sceptre",
    icon: SceptreIcon,
    titleKey: "defiProtocols.sceptre.title",
    subtitleKey: "defiProtocols.sceptre.subtitle",
    categoryKey: "defiProtocols.sceptre.category",
    useVault: useSceptreVault,
    hasData: (data) => Boolean(data?.global_kpis && data?.user_position),
    getBalance: (data) => ({
      amount: data?.user_position?.sflr_shares_balance ?? 0,
      unit: "sFLR",
    }),
    getBadge: () => null,
    DetailComponent: SceptreDetail,
  },
  {
    id: "firelight",
    icon: FirelightIcon,
    titleKey: "defiProtocols.firelight.title",
    subtitleKey: "defiProtocols.firelight.subtitle",
    categoryKey: "defiProtocols.firelight.category",
    useVault: useFirelightVault,
    hasData: (data) => Boolean(data?.global_analytics && data?.user_portfolio),
    getBalance: (data) => ({
      amount: data?.user_portfolio?.stxrp_balance ?? 0,
      unit: data?.receipt_token ?? "",
    }),
    getBadge: (data, t) => {
      if (data?.global_analytics?.insurance_pool_status !== "ROBUST_CAPITALIZED") {
        return null;
      }
      return { label: t("defiProtocols.firelight.insuranceRobust"), tone: "success" };
    },
    DetailComponent: FirelightDetail,
  },
  {
    id: "spectra",
    icon: SpectraIcon,
    titleKey: "defiProtocols.spectra.title",
    subtitleKey: "defiProtocols.spectra.subtitle",
    categoryKey: "defiProtocols.spectra.category",
    // Unlike the other three vaults, Spectra has a second axis (which
    // market) the shared registry shape below has no slot for — reading
    // the same persisted preference SpectraDetail itself writes to (see
    // useUIStore's `spectraMarket`) keeps this list-row preview showing
    // whichever market the user actually has open, rather than a market
    // this preview alone would otherwise have no way to pick.
    useVault: (address, opts) => {
      const market = useUIStore((s) => s.spectraMarket);
      return useSpectraVault(address, market, opts);
    },
    hasData: (data) => Boolean(data?.markets?.[0]?.global_analytics),
    getBalance: (data) => ({
      amount: data?.markets?.[0]?.user_position?.pt_balance ?? 0,
      unit: "PT",
    }),
    getBadge: (data, t) => {
      if (!data?.markets?.[0]?.matured) return null;
      return { label: t("defiProtocols.spectra.matured"), tone: "neutral" };
    },
    DetailComponent: SpectraDetail,
  },
];
