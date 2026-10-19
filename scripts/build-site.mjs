#!/usr/bin/env node
/**
 * Build the static site that gets published to GitHub Pages (or any static
 * host). Run AFTER `npm run daily` has produced today's report.
 *
 * Writes into daily_reports/ (already the publish dir):
 *   - index.html      copy of the latest <date>/<date>.html
 *   - archive.html    table of every <date>/<date>.html, newest first
 *
 * Existing per-date subdirs are left untouched. Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/build-site.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = "daily_reports";

if (!fs.existsSync(ROOT)) {
  console.error(`[build-site] ${ROOT}/ doesn't exist — run \`npm run daily\` first.`);
  process.exit(1);
}

// Pick up every <YYYY-MM-DD>/<YYYY-MM-DD>.html, newest first.
const dates = fs
  .readdirSync(ROOT)
  .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  .filter((d) => fs.existsSync(path.join(ROOT, d, `${d}.html`)))
  .sort((a, b) => b.localeCompare(a));

if (dates.length === 0) {
  console.error(`[build-site] no <YYYY-MM-DD>/<YYYY-MM-DD>.html found in ${ROOT}/`);
  process.exit(1);
}

// --- index.html = latest report ---
const latest = dates[0];
const latestPath = path.join(ROOT, latest, `${latest}.html`);
const latestHtml = fs
  .readFileSync(latestPath, "utf8")
  .replace(/href="\.\.\/archive\.html"/g, 'href="./archive.html"')
  .replace(/href="\.\.\/index\.html"/g, 'href="./index.html"');
fs.writeFileSync(path.join(ROOT, "index.html"), latestHtml, "utf8");
console.log(`[build-site] index.html  ← ${latest}/${latest}.html`);

// --- archive.html = list of all reports ---
const rows = dates
  .map((d) => {
    const size = (fs.statSync(path.join(ROOT, d, `${d}.html`)).size / 1024).toFixed(0);
    return `      <li><a href="./${d}/${d}.html">${d}</a> <span class="size">${size} KB</span></li>`;
  })
  .join("\n");

const reportStyle = latestHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
const preferenceScript = latestHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
const defaultTheme = latestHtml.match(/data-theme="(blue|brown)"/)?.[1] ?? "brown";
const archiveHtml = `<!doctype html>
<html lang="zh-CN" data-theme="${defaultTheme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lucy的每日AI看点 · 历史归档</title>
<style>${reportStyle}
.archive-heading{font-family:var(--serif);font-size:2.8rem;margin:32px 0 12px}.archive-meta{color:var(--muted);font-size:.85rem}ul{list-style:none;padding:0;margin:28px 0}li{display:flex;justify-content:space-between;padding:20px 24px;border:1px solid var(--rule);background:var(--bg-elevated);margin:10px 0;border-radius:6px}li a{color:var(--accent);text-decoration:none;font-weight:600}.size{color:var(--muted);font-size:.75rem}.top a{color:var(--accent)}
</style><script>${preferenceScript}</script></head><body><main>
<header class="report-header"><a class="brand" href="./index.html"><span class="brand-mark">L</span><span>Lucy的每日AI看点<small>AI & FINANCE / DAILY EDITION</small></span></a><a class="archive-link" href="./index.html">返回最新一期 ↗</a></header>
<h1 class="archive-heading">历史归档<span style="color:var(--accent)">.</span></h1>
<p class="archive-meta">共 ${dates.length} 期 · 按日期倒序排列</p><div class="top"><a href="./index.html">阅读最新一期 / ${latest} →</a></div><ul>${rows}</ul>
<footer>基于开源 DailyBrief · 保留来源与原文链接</footer></main></body></html>`;
fs.writeFileSync(path.join(ROOT, "archive.html"), archiveHtml, "utf8");
console.log(`[build-site] archive.html (${dates.length} dates)`);

// .nojekyll prevents GitHub Pages from running Jekyll, which would otherwise
// strip directories whose names start with "_". We don't have any today but
// it's cheap insurance and standard practice for static-site GH Pages.
fs.writeFileSync(path.join(ROOT, ".nojekyll"), "", "utf8");
console.log(`[build-site] .nojekyll`);
