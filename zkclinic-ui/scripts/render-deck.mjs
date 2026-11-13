/** Renders docs/deck/deck.html to docs/ZKLinic-deck.pdf with the installed Chrome: node scripts/render-deck.mjs */
import { chromium } from "@playwright/test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(process.cwd(), "..");
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(join(root, "docs/deck/deck.html")).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const out = join(root, "docs/ZKLinic-deck.pdf");
await page.pdf({ path: out, width: "1920px", height: "1080px", printBackground: true });
await browser.close();
console.log("deck:", out);
