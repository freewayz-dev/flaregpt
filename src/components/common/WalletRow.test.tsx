import { describe, it, expect, vi, afterEach } from "vitest";

import WalletRow from "@/components/common/WalletRow";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import type { WalletHubEntry } from "@/store/useWalletHubStore";

const wallet: WalletHubEntry = {
  type: "connected",
  address: "0x1234567890123456789012345678901234567890",
  label: "Primary Wallet",
};

function renderRow(onShare = vi.fn()) {
  renderWithProviders(
    <WalletRow wallet={wallet} isActive={false} copiedAddress={null} onSelect={vi.fn()} onShare={onShare} />,
  );
  return { onShare };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WalletRow — share/copy button", () => {
  it("shows Share (not Copy) and calls onShare when navigator.share is supported", () => {
    vi.stubGlobal("navigator", { ...window.navigator, share: vi.fn() });
    const { onShare } = renderRow();

    const button = screen.getByRole("button", { name: "Share address" });
    fireEvent.click(button);

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onShare.mock.calls[0][1]).toBe(wallet.address);
  });

  it("falls back to Copy address labeling when navigator.share isn't supported", () => {
    vi.stubGlobal("navigator", { ...window.navigator, share: undefined });
    renderRow();

    expect(screen.getByRole("button", { name: "Copy address" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share address" })).not.toBeInTheDocument();
  });
});
