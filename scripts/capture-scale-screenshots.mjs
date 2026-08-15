import { mkdir } from "node:fs/promises";
import process from "node:process";
import { chromium } from "@playwright/test";

const url = process.env.SCREENSHOT_URL ?? "http://127.0.0.1:4272/";
const output = "docs/screenshots/v0.7.3";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();

async function capture(name, { locale, mode, width, height }) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url);
  await page.locator("#locale-select").selectOption(locale);
  if (width > 820) await page.getByRole("button", { name: locale === "ko" ? "일시정지" : "Pause", exact: true }).click();
  if (width <= 820) await page.getByRole("button", { name: locale === "ko" ? "시각 설정" : "Visuals", exact: true }).click();
  await page.locator("#scale-mode").selectOption(mode);
  if (width <= 820) await page.getByRole("button", { name: locale === "ko" ? "시각 설정 닫기" : "Close visual settings", exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: false });
  await page.close();
}

const scenarios = [
  ["normalized-en-desktop", { locale: "en", mode: "normalized", width: 1600, height: 1000 }],
  ["physical-en-desktop", { locale: "en", mode: "physical", width: 1600, height: 1000 }],
  ["auto-fit-ko-desktop", { locale: "ko", mode: "auto-fit-physical", width: 1600, height: 1000 }],
  ["physical-ko-mobile", { locale: "ko", mode: "physical", width: 390, height: 844 }],
];
for (const [name, settings] of scenarios) {
  if (!process.argv[2] || process.argv[2] === name) await capture(name, settings);
}
await browser.close();
