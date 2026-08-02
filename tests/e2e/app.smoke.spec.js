import { expect, test } from "@playwright/test";

test("preserves the v0.1 browser interaction baseline", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");

  const canvas = page.locator("#viewport canvas");
  await expect(canvas).toHaveCount(1);
  const canvasBounds = await canvas.boundingBox();
  expect(canvasBounds).not.toBeNull();
  await page.mouse.move(canvasBounds.x + canvasBounds.width / 2, canvasBounds.y + canvasBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBounds.x + canvasBounds.width / 2 + 40, canvasBounds.y + canvasBounds.height / 2 + 20);
  await page.mouse.up();
  await page.mouse.wheel(0, -120);

  const grButton = page.getByRole("button", { name: "GR 3D" });
  const grWButton = page.getByRole("button", { name: "GR + W" });
  const wInput = page.locator("#w");

  await expect(grWButton).toHaveClass(/active/);
  await grButton.click();
  await expect(grButton).toHaveClass(/active/);
  await expect(wInput).toBeDisabled();

  await grWButton.click();
  await expect(grWButton).toHaveClass(/active/);
  await expect(wInput).toBeEnabled();

  await page.locator("#mass").evaluate((input) => {
    input.value = "200";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#mass-value")).toHaveText("200");
  await expect(page.locator("#rs")).toHaveText("4.000");

  const curvatureBefore = await page.locator("#curvature").textContent();
  await wInput.evaluate((input) => {
    input.value = "3";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#w-value")).toHaveText("3.00");
  await expect(page.locator("#curvature")).not.toHaveText(curvatureBefore);
  await expect(page.locator("#lapse")).not.toBeEmpty();
  await expect(page.locator("#vertices")).not.toBeEmpty();

  expect(consoleErrors).toEqual([]);
});
