import { describe, it, expect, vi } from "vitest";
import { useSearchParams } from "react-router";
import { http, HttpResponse} from "msw";

import ProtocolExplorer from "@/pages/DefiProtocols/components/ProtocolExplorer";
import { renderWithProviders, screen, fireEvent, within } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

// ProtocolExplorer renders two parallel layouts at once (a desktop
// list+detail rail and a mobile single-open accordion) and uses Tailwind's
// `hidden`/`lg:*` classes to show only one at a time in a real browser.
// jsdom never applies that responsive CSS, so both copies of the active
// protocol's content (list row, detail panel) are simultaneously present
// in the test DOM — scoping every query to the desktop panel via
// `data-testid="protocol-explorer-desktop"` (added to the component
// specifically for this) keeps these tests unambiguous without changing
// any real behavior.
function getDesktopPanel() {
  return within(screen.getByTestId("protocol-explorer-desktop"));
}

const MXRPY_RESPONSE = {
  global_metrics: { total_circulating_shares: 1_000_000, token_decimals: 18 },
  user_portfolio: { receipt_shares: 42 },
  token_symbol: "MXRPY",
  contract_proxy: "0xProxyMxrpy",
};

const SCEPTRE_RESPONSE = {
  global_kpis: {
    sflr_to_flr_exchange_rate: 1.08,
    total_minted_shares: 2_000_000,
    underlying_backed_flr: 2_160_000,
  },
  user_position: {
    sflr_shares_balance: 500,
    redeemable_value_flr: 540,
    pool_ownership: "0.03%",
  },
  proxy_address: "0xProxySceptre",
};

// PROTOCOLS' `useVault: (address, { enabled }) => ...` registry pattern
// (see protocols.tsx/ProtocolExplorer.tsx) exists specifically so opening
// this page only ever fetches the *currently selected* protocol's vault —
// deliberately NOT all four on mount, since that cost would grow linearly
// as more protocols are added to the registry (the file's own comments
// call this out as the reason it's shaped this way at all). That's exactly
// the kind of behavior a well-meaning future refactor ("just fetch
// everything up front, it's simpler") could silently undo without anyone
// noticing in manual testing — a real backend has no visible symptom for
// "one extra request fired," only a slowly growing initial-load cost. This
// suite protects the registry's actual selection/fetch-gating behavior,
// not just that vault data eventually renders.
function mockVaultEndpoint(path, response, onCall) {
  server.use(
    http.get(`${API}${path}`, () => {
      onCall();
      return HttpResponse.json(response);
    }),
  );
}

describe("ProtocolExplorer", () => {
  it("shows the connect-wallet empty state for the default (first) protocol when disconnected", async () => {
    renderWithProviders(<ProtocolExplorer />);

    expect(
      await getDesktopPanel().findByText("Connect a wallet to see your position"),
    ).toBeInTheDocument();
  });

  it("fetches only the active protocol's vault on mount, not the other three", async () => {
    const mxrpyCalls = vi.fn();
    const sceptreCalls = vi.fn();
    const firelightCalls = vi.fn();
    const spectraCalls = vi.fn();
    mockVaultEndpoint("/api/v1/defi/vaults/mxrpy", MXRPY_RESPONSE, mxrpyCalls);
    mockVaultEndpoint("/api/v1/defi/vaults/sceptre", SCEPTRE_RESPONSE, sceptreCalls);
    mockVaultEndpoint("/api/v1/defi/vaults/firelight", {}, firelightCalls);
    mockVaultEndpoint("/api/v1/defi/vaults/spectra", { markets: [] }, spectraCalls);

    renderWithProviders(<ProtocolExplorer />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    // MXRPY (the first/default-active protocol) renders its real data —
    // proves the active protocol's own vault genuinely resolved, not just
    // that the request was sent.
    expect(await getDesktopPanel().findByText("Your Receipt Shares")).toBeInTheDocument();
    expect(mxrpyCalls).toHaveBeenCalledTimes(1);

    // The other three protocols were never opened this session, so their
    // vaults must still be completely idle.
    expect(sceptreCalls).not.toHaveBeenCalled();
    expect(firelightCalls).not.toHaveBeenCalled();
    expect(spectraCalls).not.toHaveBeenCalled();
  });

  it("switching the active protocol fetches and displays that protocol's own data", async () => {
    mockVaultEndpoint("/api/v1/defi/vaults/mxrpy", MXRPY_RESPONSE, vi.fn());
    const sceptreCalls = vi.fn();
    mockVaultEndpoint("/api/v1/defi/vaults/sceptre", SCEPTRE_RESPONSE, sceptreCalls);
    mockVaultEndpoint("/api/v1/defi/vaults/firelight", {}, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/spectra", { markets: [] }, vi.fn());

    renderWithProviders(<ProtocolExplorer />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    const desktop = getDesktopPanel();
    await desktop.findByText("Your Receipt Shares");

    fireEvent.click(desktop.getByRole("button", { name: /Sceptre Liquid Staking/ }));

    expect(await desktop.findByText("sFLR / FLR rate")).toBeInTheDocument();
    expect(sceptreCalls).toHaveBeenCalledTimes(1);
    // The previously-active protocol's own detail content is gone — this
    // is a master-detail panel (one active protocol at a time on desktop),
    // not an accumulating list of every protocol ever opened.
    expect(desktop.queryByText("Your Receipt Shares")).not.toBeInTheDocument();
  });
});

// Phase 10 — added specifically so a Share button has a real link to hand
// out (see this file's own top-of-file comment on `PROTOCOL_PARAM`):
// before this, every `/app/defi` link landed on MXRPY regardless of what
// the sender actually had open.
describe("ProtocolExplorer — ?protocol= deep link", () => {
  it("opens directly to the protocol named in the URL, not the default first protocol", async () => {
    mockVaultEndpoint("/api/v1/defi/vaults/mxrpy", MXRPY_RESPONSE, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/sceptre", SCEPTRE_RESPONSE, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/firelight", {}, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/spectra", { markets: [] }, vi.fn());

    renderWithProviders(<ProtocolExplorer />, {
      route: "/app/defi?protocol=sceptre",
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await getDesktopPanel().findByText("sFLR / FLR rate")).toBeInTheDocument();
    expect(getDesktopPanel().queryByText("Your Receipt Shares")).not.toBeInTheDocument();
  });

  it("falls back to the default protocol for an unknown/garbage ?protocol= value instead of breaking", async () => {
    mockVaultEndpoint("/api/v1/defi/vaults/mxrpy", MXRPY_RESPONSE, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/sceptre", SCEPTRE_RESPONSE, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/firelight", {}, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/spectra", { markets: [] }, vi.fn());

    renderWithProviders(<ProtocolExplorer />, {
      route: "/app/defi?protocol=not-a-real-protocol",
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await getDesktopPanel().findByText("Your Receipt Shares")).toBeInTheDocument();
  });

  it("selecting a different protocol updates the URL's ?protocol= param", async () => {
    mockVaultEndpoint("/api/v1/defi/vaults/mxrpy", MXRPY_RESPONSE, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/sceptre", SCEPTRE_RESPONSE, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/firelight", {}, vi.fn());
    mockVaultEndpoint("/api/v1/defi/vaults/spectra", { markets: [] }, vi.fn());

    // This app's router is a MemoryRouter in tests (see test-utils.tsx),
    // which never touches the real `window.location` — a probe reading
    // useSearchParams() itself (same "mount a small real consumer of the
    // hook" pattern as GasSniperCard.test.tsx's DisconnectProbe) is what
    // actually proves the param round-trips, not just that Sceptre's own
    // content happens to render afterward.
    function SearchParamsProbe() {
      const [params] = useSearchParams();
      return <div data-testid="protocol-param">{params.get("protocol") ?? "(none)"}</div>;
    }

    renderWithProviders(
      <>
        <ProtocolExplorer />
        <SearchParamsProbe />
      </>,
      { wagmi: { connected: true, address: TEST_ADDRESSES.primary } },
    );

    const desktop = getDesktopPanel();
    await desktop.findByText("Your Receipt Shares");
    expect(screen.getByTestId("protocol-param")).toHaveTextContent("(none)");

    fireEvent.click(desktop.getByRole("button", { name: /Sceptre Liquid Staking/ }));
    await desktop.findByText("sFLR / FLR rate");

    expect(screen.getByTestId("protocol-param")).toHaveTextContent("sceptre");
  });
});
