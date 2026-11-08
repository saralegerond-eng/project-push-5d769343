#!/usr/bin/env node
/**
 * UI smoke test + responsive screenshots.
 * Requires a local Chrome/Edge install and puppeteer-core.
 *
 * Usage:
 *   npm run serve            # in another terminal (port 4173)
 *   node scripts/test-ui.js  # optional URL argument
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

const executablePath = CHROME_PATHS.find((candidate) => fs.existsSync(candidate));
if (!executablePath) {
  console.error("Chrome or Edge was not found. Install one to run the UI test.");
  process.exit(1);
}

const baseUrl = process.argv[2] || process.env.URL || "http://localhost:4173/";
const shotsDir = path.resolve(__dirname, "..", "screenshots");
fs.mkdirSync(shotsDir, { recursive: true });

const failures = [];
const passes = [];
const check = (condition, label, detail = "") => {
  if (condition) passes.push(label);
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
};

const viewports = [
  { name: "mobile-360", width: 360, height: 800, isMobile: true, deviceScaleFactor: 2 },
  { name: "mobile-390", width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
  { name: "tablet-768", width: 768, height: 1024, isMobile: true, deviceScaleFactor: 2 },
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars"]
  });

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage();
      await page.setViewport(viewport);
      await page.evaluateOnNewDocument(() => {
        window.open = () => null;
      });

      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.goto(baseUrl, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await sleep(350);

      const shotPath = path.join(shotsDir, `${viewport.name}.png`);
      await page.screenshot({ path: shotPath });

      const layout = await page.evaluate(() => {
        const rect = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return {
            top: Math.round(box.top),
            bottom: Math.round(box.bottom),
            left: Math.round(box.left),
            right: Math.round(box.right),
            width: Math.round(box.width),
            height: Math.round(box.height)
          };
        };
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          badge: rect(".badge"),
          title: rect(".hero h1"),
          subtitle: rect(".hero-sub"),
          image: rect(".product-stage"),
          price: rect(".price-lockup"),
          perks: rect(".hero-perks"),
          cta: rect(".btn-order"),
          whatsapp: rect(".wa-link"),
          trust: rect(".trust-strip"),
          sticky: rect(".sticky-bar"),
          float: rect(".wa-float"),
          header: rect(".site-header")
        };
      });

      check(
        layout.scrollWidth <= layout.innerWidth + 1,
        `${viewport.name}: no horizontal overflow`,
        `scrollWidth ${layout.scrollWidth} > viewport ${layout.innerWidth}`
      );

      if (viewport.isMobile && viewport.width <= 430) {
        const required = ["badge", "title", "subtitle", "image", "price", "perks", "cta", "whatsapp"];
        const hidden = required.filter((key) => !layout[key] || layout[key].bottom > layout.innerHeight + 2);
        check(
          hidden.length === 0,
          `${viewport.name}: hero essentials above the fold`,
          hidden.length ? `below fold: ${hidden.join(", ")}` : ""
        );
        check(layout.sticky && layout.sticky.bottom <= layout.innerHeight + 1, `${viewport.name}: sticky order bar is on screen`);
        check(layout.cta && layout.cta.height >= 44, `${viewport.name}: primary CTA is at least 44px tall`);
      }

      check(consoleErrors.length === 0, `${viewport.name}: no console errors`, consoleErrors.join(" | "));

      if (viewport.name === "mobile-390") {
        // CTA must jump straight to the form, not the price summary.
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.click(".btn-order");
        await sleep(1600);
        const jump = await page.evaluate(() => {
          const form = document.querySelector("#orderForm").getBoundingClientRect();
          const header = document.querySelector(".site-header").getBoundingClientRect();
          return {
            hash: location.hash,
            formTop: Math.round(form.top),
            headerBottom: Math.round(header.bottom),
            formFirstFieldTop: Math.round(document.querySelector("#firstName").getBoundingClientRect().top)
          };
        });
        check(jump.hash === "#orderForm", "CTA targets the order form", `hash is ${jump.hash}`);
        check(
          jump.formTop >= jump.headerBottom - 1 && jump.formTop < jump.headerBottom + 80,
          "CTA scrolls the form just below the header",
          `form top ${jump.formTop}, header bottom ${jump.headerBottom}`
        );
        check(jump.formFirstFieldTop < 844, "First name field is visible after CTA", `top ${jump.formFirstFieldTop}`);

        await page.screenshot({ path: path.join(shotsDir, "mobile-390-order.png") });

        // Quantity + total.
        await page.click('[data-qty="1"]');
        await page.click('[data-qty="1"]');
        const totals = await page.evaluate(() => ({
          quantity: document.querySelector("#quantity").value,
          lineQty: document.querySelector("#lineQty").textContent,
          total: document.querySelector("#totalPrice").textContent
        }));
        check(totals.quantity === "3" && totals.lineQty === "3" && totals.total === "597", "Quantity updates the live total", JSON.stringify(totals));

        // Empty submit -> Darija errors.
        await page.evaluate(() => document.querySelector("#orderForm").reset());
        await page.click("#submitBtn");
        await sleep(250);
        const emptyErrors = await page.evaluate(() => ({
          count: document.querySelectorAll(".field.has-error").length,
          formError: document.querySelector("#formError").hidden ? "" : document.querySelector("#formError").textContent,
          firstError: document.querySelector(".field.has-error .error")?.textContent || ""
        }));
        check(emptyErrors.count === 5, "Empty submit flags all five fields", JSON.stringify(emptyErrors));
        check(emptyErrors.formError.length > 0 && /[\u0600-\u06FF]/.test(emptyErrors.formError), "Empty submit shows a Darija form error");

        // Invalid Moroccan phone.
        await page.type("#firstName", "محمد");
        await page.type("#lastName", "العلمي");
        await page.type("#phone", "0123456789");
        await page.type("#city", "الدار البيضاء");
        await page.type("#address", "حي السلام، زنقة 12، رقم 45");
        await page.click("#submitBtn");
        await sleep(250);
        const phoneError = await page.evaluate(() => document.querySelector("#error-phone").textContent);
        check(/رقم الهاتف/.test(phoneError), "Invalid Moroccan phone is rejected", phoneError);

        // Valid phone + submit -> honest WhatsApp fallback panel.
        await page.evaluate(() => {
          const phone = document.querySelector("#phone");
          phone.value = "";
        });
        await page.type("#phone", "0612345678");
        await page.evaluate(() => {
          localStorage.removeItem("bonchoix:last-order:v1");
        });
        await page.click("#submitBtn");
        await sleep(700);
        const fallback = await page.evaluate(() => ({
          successVisible: !document.querySelector("#orderSuccess").hidden,
          formHidden: document.querySelector("#orderGrid").hidden,
          title: document.querySelector("#successTitle").textContent,
          text: document.querySelector("#successText").textContent,
          note: document.querySelector("#successNote").textContent,
          waHref: document.querySelector("#successWa").getAttribute("href"),
          waLabel: document.querySelector("#successWaLabel").textContent
        }));
        check(fallback.successVisible && fallback.formHidden, "Valid submit shows the confirmation panel");
        check(/ما تسجلش/.test(fallback.text) && /ما تسجلش/.test(fallback.note), "Fallback clearly says the order was not saved automatically", JSON.stringify(fallback));
        check(fallback.waHref.includes("wa.me/212679502789") && decodeURIComponent(fallback.waHref).includes("محمد"), "WhatsApp fallback pre-fills the order details");
        check(/واتساب/.test(fallback.waLabel), "Fallback button asks the user to confirm on WhatsApp");

        await page.screenshot({ path: path.join(shotsDir, "mobile-390-success.png") });

        // Duplicate guard (same phone inside the window).
        await page.click("#newOrder");
        await sleep(600);
        await page.evaluate(() => {
          const set = (selector, value) => {
            const input = document.querySelector(selector);
            input.value = value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          };
          set("#firstName", "محمد");
          set("#lastName", "العلمي");
          set("#phone", "0612345678");
          set("#city", "الدار البيضاء");
          set("#address", "حي السلام، زنقة 12، رقم 45");
        });
        await page.click("#submitBtn");
        await sleep(300);
        const duplicate = await page.evaluate(() => ({
          visible: !document.querySelector("#formError").hidden,
          message: document.querySelector("#formError").textContent
        }));
        check(duplicate.visible && /تصيفط قريب/.test(duplicate.message), "Duplicate submit is blocked", duplicate.message);

        await page.close();
      } else {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\nBON CHOIX — UI smoke test\n");
  passes.forEach((message) => console.log(`  ✓ ${message}`));
  if (failures.length) {
    console.log("");
    failures.forEach((message) => console.log(`  ✗ ${message}`));
    console.log(`\n${failures.length} check(s) failed.\n`);
    process.exit(1);
  }
  console.log(`\nAll ${passes.length} checks passed. Screenshots: screenshots/\n`);
})();
