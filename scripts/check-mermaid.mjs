/**
 * Parse every mermaid block in every markdown file, and fail if one is invalid.
 *
 * GitHub renders a broken block as a red "Unable to render rich display" box
 * rather than a diagram, and it does so silently at review time — nothing in
 * CI notices, because a markdown file always "builds". This runs the real
 * mermaid parser over the same source GitHub will, so a diagram that will not
 * render fails here instead.
 *
 * The failure that prompted this: mermaid treats `;` as a statement separator,
 * including inside note text, so one semicolon in a sentence killed a whole
 * diagram. That class of thing is invisible to review and obvious to a parser.
 *
 * mermaid needs a DOM even to parse, hence jsdom.
 */

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKIP = new Set(["node_modules", ".git", "dist", "build", "test-results"]);

function markdownFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...markdownFiles(full));
    else if (entry.name.endsWith(".md")) found.push(full);
  }
  return found;
}

/** Every mermaid block in `source`, with the 1-indexed line its fence sits on. */
function mermaidBlocks(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];
  let start = -1;

  lines.forEach((line, i) => {
    if (start === -1 && /^\s*```mermaid\s*$/.test(line)) {
      start = i;
    } else if (start !== -1 && /^\s*```\s*$/.test(line)) {
      blocks.push({
        fenceLine: start + 1,
        code: lines.slice(start + 1, i).join("\n"),
      });
      start = -1;
    }
  });

  return blocks;
}

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.SVGElement = dom.window.SVGElement;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});

const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

let checked = 0;
let failed = 0;

for (const file of markdownFiles(ROOT)) {
  const blocks = mermaidBlocks(fs.readFileSync(file, "utf8"));
  for (const { fenceLine, code } of blocks) {
    checked++;
    const where = `${path.relative(ROOT, file).replace(/\\/g, "/")}:${fenceLine}`;
    try {
      await mermaid.parse(code);
    } catch (err) {
      failed++;
      // Mermaid reports lines relative to the block; offset them to the file so
      // the location is somewhere you can actually click.
      const message = String(err?.message ?? err).replace(
        /Parse error on line (\d+)/,
        (_, n) => `Parse error on line ${fenceLine + Number(n)}`,
      );
      console.error(`\n✖ ${where}\n${message}`);
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${checked} mermaid blocks will not render.`);
  process.exit(1);
}

console.log(`${checked} mermaid blocks parse.`);
