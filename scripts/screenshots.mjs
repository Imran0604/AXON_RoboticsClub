// ============================================================================
// Captures the README screenshots by driving a real Chrome.
//
//   node scripts/screenshots.mjs [baseUrl]
//
// Uses puppeteer-core against an already-installed Chrome rather than
// puppeteer, which would download its own ~150MB copy. Set CHROME_PATH if it
// is not in one of the usual places.
//
// Admin pages need a session, so the script mints the same signed cookie the
// app issues and sets it before navigating — no login form to automate.
// ============================================================================

import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { SignJWT } from "jose";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "screenshots");
const BASE = process.argv[2] || process.env.SITE_URL || "http://localhost:3000";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const home = process.env.LOCALAPPDATA || "";
  const pf = process.env["ProgramFiles"] || "C:\\Program Files";
  const pf86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const candidates = [
    `${home}\\Google\\Chrome\\Application\\chrome.exe`,
    `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
    `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
    `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error("No Chrome found. Set CHROME_PATH to your browser executable.");
}

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

/** Routes to capture: [file number, name, path, viewport, options] */
const SHOTS = [
  ["01", "home", "/", DESKTOP, { full: false }],
  ["02", "fests", "/fests", DESKTOP, {}],
  ["03", "events-filtered", "/events?category=Hardware&fee=free", DESKTOP, {}],
  ["04", "event-detail", "/events/line-follower-championship", DESKTOP, {}],
  ["05", "register", "/events/robotic-arm-pick-and-place/register", DESKTOP, { as: "participant" }],
  ["06", "ticket", null, DESKTOP, { as: "participant", ticket: true }],
  ["07", "admin-dashboard", "/admin", DESKTOP, { as: "admin" }],
  ["08", "admin-participants", "/admin/registrations?status=waitlisted", DESKTOP, { as: "admin" }],
  ["09", "form-builder", null, DESKTOP, { as: "admin", builder: true }],
  ["10", "scanner", "/admin/scan", DESKTOP, { as: "admin" }],
  ["11", "assistant", "/", DESKTOP, { assistant: true }],
  ["12", "reviewer-guide", "/judge", DESKTOP, {}],
  ["13", "mobile-events", "/events", MOBILE, {}],
  ["14", "mobile-admin", "/admin/registrations", MOBILE, { as: "admin" }],
  ["15", "light-theme", "/", DESKTOP, { light: true }],
];

const USERS = {
  admin: ["b0000000-0000-4000-8000-000000000001", "Nusrat Jahan Rahman", "admin@axon.club", "admin"],
  participant: ["b0000000-0000-4000-8000-000000000003", "Imran Kabir", "student@axon.club", "participant"],
};

async function mint(role) {
  const [sub, name, email, r] = USERS[role];
  return new SignJWT({ name, email, role: r })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: "new",
  args: ["--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none"],
});

const host = new URL(BASE).hostname;
console.log(`capturing ${SHOTS.length} screenshots from ${BASE}\n`);

for (const [n, name, path, viewport, opt] of SHOTS) {
  const page = await browser.newPage();
  await page.setViewport(viewport);

  if (opt.as) {
    await page.setCookie({
      name: "axon_session",
      value: await mint(opt.as),
      domain: host,
      path: "/",
      httpOnly: true,
      secure: BASE.startsWith("https"),
    });
  }
  if (opt.light) {
    // Seed the stored preference before the no-flash script reads it.
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem("axon-theme", "light");
      } catch {}
    });
  }

  let target = path;

  // Routes that need a value looked up from the page itself.
  if (opt.ticket || opt.builder) {
    const seed = opt.ticket ? "/me/registrations" : "/admin/events";
    await page.goto(BASE + seed, { waitUntil: "networkidle2", timeout: 60000 });
    target = await page.evaluate((kind) => {
      const sel = kind === "ticket" ? 'a[href^="/tickets/"]' : 'a[href^="/admin/events/"]';
      const links = [...document.querySelectorAll(sel)]
        .map((a) => a.getAttribute("href"))
        .filter((h) => h && !h.endsWith("/new"));
      return links[0] || null;
    }, opt.ticket ? "ticket" : "builder");
    if (!target) {
      console.log(`  ${n} ${name.padEnd(20)} SKIPPED (no link found)`);
      await page.close();
      continue;
    }
  }

  await page.goto(BASE + target, { waitUntil: "networkidle2", timeout: 60000 });

  // Let fonts, canvas animation and entrance transitions settle.
  await page.evaluate(() => document.fonts?.ready);
  await sleep(opt.assistant ? 900 : 1400);

  if (opt.assistant) {
    // Open the panel and ask a real question, so the shot shows a real answer.
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /ask about events/i.test(b.textContent || "")
      );
      btn?.click();
    });
    await sleep(500);
    await page.type('input[aria-label="Your question"]', "Which events are free?", { delay: 18 });
    await page.evaluate(() => {
      const f = document.querySelector('input[aria-label="Your question"]')?.closest("form");
      f?.requestSubmit();
    });
    await sleep(2200);
  }

  const file = join(OUT, `${n}-${name}.png`);
  await page.screenshot({ path: file, fullPage: Boolean(opt.full) });
  const kb = (await import("node:fs")).statSync(file).size / 1024;
  console.log(`  ${n} ${name.padEnd(20)} ${viewport.width}x${viewport.height}  ${kb.toFixed(0)} KB`);
  await page.close();
}

await browser.close();
console.log(`\nwrote ${SHOTS.length} files to docs/screenshots/`);
