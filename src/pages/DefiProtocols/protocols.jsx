import MxrpyIcon from "@/assets/protocols/mxrpy.svg";
import SceptreIcon from "@/assets/protocols/sceptre.svg";

import {
  useMxrpyVault,
  useSceptreVault,
  useFirelightVault,
} from "@/hooks/queries/useDefiProtocolsQueries";
import MxrpyDetail from "@/pages/DefiProtocols/components/details/MxrpyDetail";
import SceptreDetail from "@/pages/DefiProtocols/components/details/SceptreDetail";
import FirelightDetail from "@/pages/DefiProtocols/components/details/FirelightDetail";
import FirelightIcon from "@/pages/DefiProtocols/components/shared/FirelightIcon";

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
];
