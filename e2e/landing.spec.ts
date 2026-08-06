import { test, expect } from "@playwright/test";

// Proves prerender.js actually ran and its output is what gets served —
// not just that the page eventually renders something via CSR. Fetching
// the raw response body (no JS execution) and asserting real content is
// already in it is the one check that can tell "prerendered" apart from
// "client-rendered fast enough to look prerendered" — a page.goto() alone
// can't distinguish the two.
test("landing page is served pre-rendered", async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/`);
  const html = await response.text();

  expect(html).toContain("Everything");
  expect(html).toContain("Simplified.");
  expect(html).toContain("What is FlareGPT?");
});

test("landing page hydrates — FAQ accordion responds to a click", async ({ page }) => {
  await page.goto("/");

  const question = page.getByRole("button", { name: "What is FlareGPT?" });
  await expect(question).toHaveAttribute("aria-expanded", "false");

  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText(
      "FlareGPT is an AI layer that connects to your wallets and turns on-chain data into simple, actionable insights in real time.",
    ),
  ).toBeVisible();
});
