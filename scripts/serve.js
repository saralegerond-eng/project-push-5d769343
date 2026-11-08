#!/usr/bin/env node
/**
 * Minimal zero-dependency static server for local testing.
 *
 * Usage:
 *   npm run serve            # http://localhost:4173
 *   npm run serve -- 8080    # custom port
 */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const root = path.resolve(__dirname, "..");
const portArg = Number.parseInt(process.argv[2], 10);
const port = Number.isFinite(portArg) && portArg > 0 ? portArg : Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json"
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  if (pathname.endsWith("/")) pathname += "index.html";

  const filePath = path.resolve(root, `.${pathname}`);
  const relative = path.relative(root, filePath);

  // Block path traversal and dotfiles outside the project root.
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
          '<title>404</title><body style="font-family:sans-serif;padding:40px;text-align:center">' +
          "<h1>404</h1><p>الصفحة ما كايناش.</p><a href=\"/\">الرجوع للصفحة الرئيسية</a></body></html>"
      );
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    };

    res.writeHead(200, headers);
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`BON CHOIX landing page: http://localhost:${port}`);
  console.log("Press Ctrl+C to stop.");
});
