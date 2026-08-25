// Regenerates module.json's "description" from README.md so the two never drift out of sync.
// Run manually with `npm run build:description`, or let the release workflow run it automatically.
"use strict";

const fs = require("fs");
const path = require("path");
const { marked, Renderer } = require("marked");

const ROOT = path.resolve(__dirname, "..");
const README_PATH = path.join(ROOT, "README.md");
const MODULE_JSON_PATH = path.join(ROOT, "module.json");

marked.setOptions({ gfm: true });

const moduleJson = JSON.parse(fs.readFileSync(MODULE_JSON_PATH, "utf8"));

// README images (e.g. GIF walkthroughs) live only in the git repo, not in the release zip, so keep
// module storage small. Rewrite their relative paths to absolute GitHub raw URLs, pinned to the
// commit/tag being built, so they still render in the FVTT package browser and in old changelogs.
const repoMatch = /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(moduleJson.url || "");
const ref = process.env.GITHUB_REF_NAME || "main";
const renderer = new Renderer();
if (repoMatch) {
  const [, owner, repo] = repoMatch;
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/`;
  const defaultImage = renderer.image.bind(renderer);
  renderer.image = (href, title, text) => {
    const absoluteHref = /^([a-z]+:)?\/\//i.test(href) ? href : rawBase + href.replace(/^\.?\//, "");
    return defaultImage(absoluteHref, title, text);
  };
}

let readme = fs.readFileSync(README_PATH, "utf8");

// Drop the leading "# Title" line only - Foundry already renders the module's own "title" field
// above the description, so repeating it here would be redundant.
readme = readme.replace(/^#\s.*\r?\n+/, "");

const html = marked.parse(readme.trim(), { renderer }).trim();

moduleJson.description = html;

fs.writeFileSync(MODULE_JSON_PATH, JSON.stringify(moduleJson, null, 2) + "\n", "utf8");

console.log(
  `Updated "description" in ${path.relative(ROOT, MODULE_JSON_PATH)} from ${path.relative(ROOT, README_PATH)} (${html.length} chars).`
);
