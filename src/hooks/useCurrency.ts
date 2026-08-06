import { useQuery } from "@tanstack/react-query";

import { fetchExchangeRates } from "@/services/currencyService";
import { useUIStore } from "@/store/useUIStore";

// Centralizes the Currency Display preference (Settings > Preferences) so
// every USD-denominated value in the dashboard converts and formats
// consistently. FX rates change slowly, so a 1-hour staleTime avoids
// refetching on every render without the values ever going stale in any
// way a user would notice.
export function useCurrency() {
  const currency = useUIStore((state) => state.currency);

  const { data: rates, isLoading, isError } = useQuery({
    queryKey: ["exchangeRates"],
    queryFn: fetchExchangeRates,
    staleTime: 60 * 60_000,
  });

  const convert = (usdValue: number | null | undefined) => {
    if (usdValue == null) return null;
    const rate = rates?.[currency];
    if (currency === "USD" || !rate) return usdValue;
    return usdValue * rate;
  };

  const formatCurrency = (
    usdValue: number | null | undefined,
    options: Intl.NumberFormatOptions = {},
  ) => {
    const converted = convert(usdValue);
    if (converted == null) return "—";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        ...options,
      }).format(converted);
    } catch {
      return `${converted.toFixed(2)} ${currency}`;
    }
  };

  return { currency, rates, isLoading, isError, convert, formatCurrency };
}
