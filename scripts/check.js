#!/usr/bin/env node
/**
 * Zero-dependency sanity checks for the landing page.
 * Verifies local asset references, required copy, form wiring and JS syntax.
 *
 * Usage: npm test
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const failures = [];
const passes = [];

const fail = (message) => failures.push(message);
const pass = (message) => passes.push(message);

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const html = read("index.html");
const css = read("assets/css/styles.css");
const mainJs = read("assets/js/main.js");
const configJs = read("assets/js/config.js");
const adminHtml = read("admin/index.html");
const adminJs = read("assets/js/admin.js");
const robotsTxt = read("robots.txt");
const sitemapXml = read("sitemap.xml");

/* ---------- Local asset references ---------- */
const refs = new Set();
const attrPattern = /\b(?:src|href)="([^"]+)"/g;
let match;
while ((match = attrPattern.exec(html))) {
  const value = match[1];
  if (!/^(?:https?:|mailto:|tel:|#|data:)/.test(value)) refs.add(value);
}

const srcsetPattern = /\bsrcset="([^"]+)"/g;
while ((match = srcsetPattern.exec(html))) {
  match[1]
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
    .forEach((value) => {
      if (!/^(?:https?:|data:)/.test(value)) refs.add(value);
    });
}

const missing = [...refs].filter((ref) => !exists(ref));
if (missing.length) missing.forEach((ref) => fail(`Missing local asset: ${ref}`));
else pass(`All ${refs.size} local asset references resolve`);

/* ---------- Image alt attributes ---------- */
const imgTags = html.match(/<img\b[^>]*>/g) || [];
const imagesWithoutAlt = imgTags.filter((tag) => !/\balt="[^"]*"/.test(tag));
if (imagesWithoutAlt.length) fail(`${imagesWithoutAlt.length} <img> tag(s) missing alt text`);
else pass(`All ${imgTags.length} <img> tags have alt text`);

/* ---------- Required content ---------- */
const required = [
  "عرض خاص بالمغرب",
  "تنفس براحة أكثر",
  "199 درهم فقط",
  "اطلب دابا بـ 199 درهم",
  "التوصيل مجاني",
  "الأداء عند الاستلام",
  "متفوتش الفرصة!",
  "4 Intake Bands",
  "15 Adhesive Applications",
  "1 Magnetic Applicator",
  "عندك شي سؤال؟ تواصل معانا",
  "0679502789",
  "https://wa.me/212679502789",
  "الأسماء مختصرة",
  "FREE DELIVERY",
  "اطلب الآن"
];
const missingCopy = required.filter((text) => !html.includes(text));
if (missingCopy.length) missingCopy.forEach((text) => fail(`Missing required copy: ${text}`));
else pass(`All ${required.length} required copy strings are present`);

/* ---------- Forbidden / conflicting claims ---------- */
const forbidden = [/30\s*ملصق/, /30\s*Adhesive/i, /يعالج الشخير نهائ/i, /وداع نهائي للشخير/i, /aggregateRating/];
forbidden.forEach((pattern) => {
  if (pattern.test(html)) fail(`Forbidden claim/pattern found: ${pattern}`);
});
if (!failures.some((item) => item.startsWith("Forbidden"))) pass("No conflicting 30-day claims, fake ratings or cure promises");

/* ---------- Form wiring ---------- */
const fieldNames = ["firstName", "lastName", "phone", "city", "address"];
fieldNames.forEach((name) => {
  if (!html.includes(`id="${name}"`)) fail(`Missing form input #${name}`);
  if (!html.includes(`data-field="${name}"`)) fail(`Missing form field wrapper for ${name}`);
  if (!html.includes(`id="error-${name}"`)) fail(`Missing error element for ${name}`);
});
if (!failures.some((item) => item.startsWith("Missing form"))) pass("All order form fields and error slots are wired");

if (!/type="number"[^>]*min="1"[^>]*max="10"[^>]*value="1"/.test(html)) {
  fail("Quantity input must be a number field defaulting to 1 (min 1, max 10)");
} else {
  pass("Quantity input defaults to 1 with min/max limits");
}

/* ---------- Key JS hooks ---------- */
const hooks = ["orderForm", "orderSuccess", "stickyBar", "successWa", "successWaLabel", "totalPrice", "lineQty"];
const missingHooks = hooks.filter((id) => !html.includes(`id="${id}"`));
if (missingHooks.length) missingHooks.forEach((id) => fail(`Missing JS hook #${id}`));
else pass("All JS hooks exist in the markup");

/* ---------- JS syntax ---------- */
try {
  new vm.Script(mainJs, { filename: "main.js" });
  new vm.Script(configJs, { filename: "config.js" });
  new vm.Script(adminJs, { filename: "admin.js" });
  pass("JavaScript files parse without syntax errors");
} catch (error) {
  fail(`JavaScript syntax error: ${error.message}`);
}

/* ---------- CSS brace balance ---------- */
const openBraces = (css.match(/{/g) || []).length;
const closeBraces = (css.match(/}/g) || []).length;
if (openBraces !== closeBraces) fail(`CSS braces are unbalanced (${openBraces} open / ${closeBraces} close)`);
else pass(`CSS braces are balanced (${openBraces} blocks)`);

/* ---------- RTL / SEO ---------- */
if (!/<html lang="ar" dir="rtl">/.test(html)) fail("HTML root must be lang=ar dir=rtl");
else pass("RTL document language is set");

const seoChecks = [
  [/<title>[^<]{10,}<\/title>/, "title"],
  [/name="description" content="[^"]{50,}"/, "meta description"],
  [/rel="canonical" href="https?:\/\/[^"]+"/, "canonical URL"],
  [/property="og:image" content="https?:\/\/[^"]+"/, "Open Graph image"],
  [/application\/ld\+json/, "JSON-LD"]
];
seoChecks.forEach(([pattern, label]) => {
  if (!pattern.test(html)) fail(`Missing or incomplete SEO element: ${label}`);
});
if (!failures.some((item) => item.startsWith("Missing or incomplete SEO"))) pass("Core SEO metadata is present");

/* ---------- Search discovery ---------- */
if (!/User-agent:\s*\*/.test(robotsTxt) || !/Allow:\s*\//.test(robotsTxt) || !robotsTxt.includes("Sitemap: https://project-launch-bridge.lovable.app/sitemap.xml")) {
  fail("robots.txt must allow crawlers and reference the public sitemap");
} else {
  pass("Crawler rules allow the public site and reference the sitemap");
}
if (!sitemapXml.includes("https://project-launch-bridge.lovable.app/") || sitemapXml.includes("/admin/")) {
  fail("sitemap.xml must list the public landing page and exclude the private dashboard");
} else {
  pass("Sitemap lists the public landing page only");
}

/* ---------- Private dashboard wiring ---------- */
const adminChecks = [
  [adminHtml.includes('name="robots" content="noindex, nofollow"'), "Private dashboard must not be indexed"],
  [adminHtml.includes("supabase-client.js") && adminHtml.includes("admin.js"), "Private dashboard scripts must be wired"],
  [adminJs.includes('eq("role", "admin")'), "Dashboard must verify an admin role"],
  [adminJs.includes('signInWithPassword'), "Dashboard must use password sign-in"],
  [mainJs.includes('.from("orders")') && mainJs.includes('status: "new"'), "Landing form must save new orders"],
  [mainJs.includes('.from("site_visits").insert({})'), "Landing page must record anonymous visit totals"],
  [adminJs.includes('"زيارات الموقع"') && adminJs.includes('"زيارات اليوم"'), "Dashboard must show total and daily visits"],
  [configJs.includes('source: "landing-page"'), "Landing order source must match the accepted order rule"]
];
adminChecks.forEach(([condition, label]) => {
  if (!condition) fail(label);
});
if (!failures.some((item) => adminChecks.some(([, label]) => item === label))) pass("Private dashboard and order saving are wired");

/* ---------- Report ---------- */
console.log("\nBON CHOIX — landing page checks\n");
passes.forEach((message) => console.log(`  ✓ ${message}`));
if (failures.length) {
  console.log("");
  failures.forEach((message) => console.log(`  ✗ ${message}`));
  console.log(`\n${failures.length} check(s) failed.\n`);
  process.exit(1);
}
console.log(`\nAll ${passes.length} checks passed.\n`);
