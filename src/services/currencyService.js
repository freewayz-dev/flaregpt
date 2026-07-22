import { exchangeRateApi } from "@/services/apiClient";

export async function fetchExchangeRates() {
  const { data } = await exchangeRateApi.get("/latest/USD");
  return data.rates; // { USD: 1, AUD: 1.43, EUR: 0.88, GBP: 0.74, RUB: 78.3, ... }
}
