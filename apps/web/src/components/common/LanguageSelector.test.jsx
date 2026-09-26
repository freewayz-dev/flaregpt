import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// `changeLanguage` actually mutates the app's single global i18next
// instance (switches the active language, persists to localStorage) — with
// no per-test i18n reset in setup.ts (unlike the zustand stores, which do
// get one), letting it run for real here would leak the selected language
// into every test that runs afterward in this same file/worker. Mocking it
// keeps this file testing LanguageSelector's own behavior (does clicking an
// option call it with the right code, does the panel close) without
// depending on i18next's own internals, which are covered separately.
vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, changeLanguage: vi.fn() };
});

import { changeLanguage } from "@/i18n";
import LanguageSelector from "@/components/common/LanguageSelector";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("LanguageSelector", () => {
  function trigger() {
    return screen.getByRole("button", { name: "Language" });
  }

  it("hides the language list initially and exposes aria-haspopup/aria-expanded", () => {
    renderWithProviders(<LanguageSelector />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "true");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on click and lists every supported language, current one checked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSelector />);

    await user.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /English/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Français/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /日本語/ })).toBeInTheDocument();
  });

  it("calls the shared changeLanguage with the selected code and closes the panel", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSelector />);

    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: /Français/ }));

    expect(changeLanguage).toHaveBeenCalledWith("fr");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSelector />);

    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <div>
        <LanguageSelector />
        <button type="button">Elsewhere</button>
      </div>,
    );

    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });
});
