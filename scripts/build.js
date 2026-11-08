#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const entries = ["index.html", "assets", "admin", "robots.txt", "sitemap.xml"];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const entry of entries) {
  fs.cpSync(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

console.log("Created deployable site in dist/");