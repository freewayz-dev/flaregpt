import { describe, it, expect, vi } from "vitest";

import WalletRow from "@/components/common/WalletRow";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";


const wallet = {
  type: "connected",
  address: "0x1234567890123456789012345678901234567890",
  label: "Primary Wallet",
};

function renderRow(onCopy = vi.fn()) {
  renderWithProviders(
    <WalletRow wallet={wallet} isActive={false} copiedAddress={null} onSelect={vi.fn()} onCopy={onCopy} />,
  );
  return { onCopy };
}

describe("WalletRow — copy button", () => {
  it("always shows Copy address and calls onCopy with the wallet's address", () => {
    const { onCopy } = renderRow();

    const button = screen.getByRole("button", { name: "Copy address" });
    fireEvent.click(button);

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy.mock.calls[0][1]).toBe(wallet.address);
  });
});
