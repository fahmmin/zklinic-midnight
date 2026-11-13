/**
 * Records the product video: the app runs in a phone on the left, the explanation sits on the right.
 * Needs the dev server (`npm run dev:preprod`); the live-app part uses the dev-only preview wallet, so no 1AM is needed.
 *
 *   node scripts/record-demo.mjs [baseUrl]   ->  demo-video/zklinic-demo.webm (+ .mp4 if ffmpeg is on PATH)
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:5199";
const OUT = join(process.cwd(), "demo-video");
const SIZE = { width: 1920, height: 1080 };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const STAGE = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;height:100%;background:#eceae3;font-family:"DM Sans",system-ui,sans-serif;color:#141414}
  .stage{display:grid;grid-template-columns:780px 1fr;height:100%;align-items:center}
  .phone{justify-self:center;width:390px;height:844px;padding:14px;border-radius:56px;background:#141414;
    box-shadow:0 30px 80px rgba(20,20,20,.28);transform:scale(1.13);transform-origin:center}
  .phone iframe{width:390px;height:844px;border:0;border-radius:44px;background:#fff;display:block}
  .copy{padding-right:150px;max-width:860px}
  .step{font-size:26px;font-weight:600;color:#6b7c3a;margin:0 0 22px}
  h1{font-size:72px;line-height:1.05;letter-spacing:-.02em;margin:0 0 28px;font-weight:700}
  p{font-size:32px;line-height:1.4;margin:0;color:#3d3d39}
  .copy>*{transition:opacity .35s}
  .fade>*{opacity:0}
</style></head><body><div class="stage">
  <div class="phone"><iframe id="app" src="about:blank"></iframe></div>
  <div class="copy" id="copy"><div class="step" id="step"></div><h1 id="title"></h1><p id="body"></p></div>
</div></body></html>`;

// Uses the installed Google Chrome, so no Playwright browser download is needed.
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: OUT, size: SIZE } });
const page = await context.newPage();
// Serve the stage from the app's origin so the phone iframe is first-party and may use localStorage.
await page.route(BASE + "/__stage", (route) => route.fulfill({ contentType: "text/html", body: STAGE }));
await context.route(BASE + "/__blank", (route) => route.fulfill({ contentType: "text/html", body: "<body style=\"background:#f4f3ef\"></body>" }));
await page.goto(BASE + "/__stage", { waitUntil: "networkidle" });
const pause = (ms) => page.waitForTimeout(ms);
const app = page.frames().find((f) => f !== page.mainFrame());

/** Swap the right-hand text, then hold it on screen. */
async function say(step, title, body, ms = 4000) {
  await page.evaluate(
    async ([s, t, b]) => {
      const copy = document.getElementById("copy");
      copy.classList.add("fade");
      await new Promise((r) => setTimeout(r, 350));
      document.getElementById("step").textContent = s;
      document.getElementById("title").textContent = t;
      document.getElementById("body").textContent = b;
      copy.classList.remove("fade");
    },
    [step, title, body]
  );
  await pause(ms);
}
async function open(path, preview = null) {
  await app.goto(BASE + "/__blank");
  await app.evaluate((p) => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("zkclinic-role:") || k.startsWith("zkclinic-didit:")) localStorage.removeItem(k);
    localStorage.removeItem("zkclinic-reconnect");
    localStorage.removeItem("zkclinic-demo-mode");
    if (p) localStorage.setItem("zkclinic-ui-preview", p);
    else localStorage.removeItem("zkclinic-ui-preview");
  }, preview);
  await app.goto(BASE + path);
  await pause(1200);
}
const tap = async (testId, after = 1600) => {
  const el = app.getByTestId(testId);
  await el.scrollIntoViewIfNeeded();
  await el.click();
  await pause(after);
};

await open("/");
await say("ZKLinic", "Join a clinical trial without handing over your records.", "Built on Midnight. Health data stays on the patient's phone; only a zero-knowledge proof goes on-chain.", 5500);

await open("/demo");
await say("1 · Doctor", "A doctor signs Asha's health card.", "Only a hash of the card is published. The card itself stays on her phone.", 3000);
await tap("gd-sign", 2200);
await say("2 · Patient", "Asha proves she fits the study.", "Age 18–65, type 2 diabetes, HbA1c in range. Her phone proves it; the numbers never leave it.", 3000);
await tap("gd-check", 3200);
await say("3 · Study team", "The study sees a code name, not Asha.", "The contract checked the proof. Enrollment is bound to it, so places only go to people who really qualify.", 3000);
await tap("gd-join", 3500);
await say("Privacy by default", "Ravi is 71. He tries the same study.", "The proof fails: he is outside the age range. Nothing about him is published.", 2500);
await tap("gd-ravi", 1200);
await tap("gd-sign", 1500);
await tap("gd-check", 4500);

await open("/app/patient");
await say("Sign in", "Your wallet is your account.", "No email, no password. One tap with 1AM on Chrome, Android or iOS.", 5000);

await open("/app/patient", "1");
await say("First visit", "Pick your role once.", "Patients and study teams start right away. The app remembers the choice for this wallet.", 4500);
await tap("role-patient", 1500);
await say("Patient", "Get a code, collect your card.", "Show the code to your doctor. The signed card lands on this phone, ready to check fit and join studies.", 6000);

await open("/app/trials", "1");
await tap("role-trials", 1500);
await say("Study team", "Publish who can join.", "Set the rules once. Only verified, eligible patients can enroll, and you never see their records.", 5000);

// Didit step: run the verification API with DIDIT_MOCK=1 so it approves instantly.
await open("/app/doctor", "1");
await tap("role-doctor", 1500);
await app.getByTestId("didit-panel").scrollIntoViewIfNeeded();
await say("Doctor sign-up", "Doctors prove who they are, once.", "Medical ID card plus an ID and selfie check by Didit. ZKLinic keeps only the result, never the ID.", 4500);
await tap("btn-didit", 3000);
await app.getByTestId("didit-verified").scrollIntoViewIfNeeded();
await say("Doctor sign-up", "Identity verified.", "One tap to register. The clinic approves the doctor on Midnight.", 4500);

await open("/app/doctor", "doctor");
await say("Doctor", "Doctors are recognised on-chain.", "A doctor verifies their medical ID once. After approval the app opens straight to issuing health cards.", 5500);

await say("ZKLinic", "Recruit verified patients without collecting health data.", "Private by design, on Midnight.", 4500);

const video = page.video();
await context.close();
await browser.close();
const webm = join(OUT, "zklinic-demo.webm");
renameSync(await video.path(), webm);
console.log("video:", webm);
try {
  const mp4 = join(OUT, "zklinic-demo.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", mp4]);
  console.log("video:", mp4);
} catch {
  console.log("ffmpeg not found; kept the .webm only");
}
console.log(readdirSync(OUT).join(", "));
