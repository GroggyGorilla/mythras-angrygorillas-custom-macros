// Regenerates module.json's "description" from README.md so the two never drift out of sync.
// Run manually with `npm run build:description`, or let the release workflow run it automatically.
"use strict";

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const ROOT = path.resolve(__dirname, "..");
const README_PATH = path.join(ROOT, "README.md");
const MODULE_JSON_PATH = path.join(ROOT, "module.json");

marked.setOptions({ gfm: true });

let readme = fs.readFileSync(README_PATH, "utf8");

// Drop the leading "# Title" line only - Foundry already renders the module's own "title" field
// above the description, so repeating it here would be redundant.
readme = readme.replace(/^#\s.*\r?\n+/, "");

const html = marked.parse(readme.trim()).trim();

const moduleJson = JSON.parse(fs.readFileSync(MODULE_JSON_PATH, "utf8"));
moduleJson.description = html;

fs.writeFileSync(MODULE_JSON_PATH, JSON.stringify(moduleJson, null, 2) + "\n", "utf8");

console.log(
  `Updated "description" in ${path.relative(ROOT, MODULE_JSON_PATH)} from ${path.relative(ROOT, README_PATH)} (${html.length} chars).`
);
