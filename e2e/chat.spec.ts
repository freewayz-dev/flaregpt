import { test, expect } from "@playwright/test";

import { ROUTES } from "../src/config/routes";
import { mockChatSocket } from "./mocks/network";

test("guest chat: send a message, receive a mocked streamed reply", async ({ page }) => {
  await mockChatSocket(page, { reply: "Mocked reply from FlareGPT." });

  await page.goto(ROUTES.flareGpt);

  const input = page.getByRole("textbox", { name: "Ask FlareGPT..." });
  await input.fill("Hello from E2E");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Hello from E2E")).toBeVisible();
  await expect(page.getByText("Mocked reply from FlareGPT.")).toBeVisible();
});
