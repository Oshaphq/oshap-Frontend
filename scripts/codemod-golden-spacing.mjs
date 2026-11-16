#!/usr/bin/env node
/**
 * Moves spacing utilities from the 4pt grid onto the golden-ratio scale.
 *
 *   old  xs 4 · s 8 · md 16 · l 24 · xl 32 · 2xl 40 · 3xl 48 · 4xl 56 · 5xl 64 … 11xl 128
 *   new  xs 4 · s 6 · md 10 · l 17 · xl 27 · 2xl 44 · 3xl 72 · 4xl 116   (4 × 1.618ⁿ)
 *
 * Old and new share names with different values, so every class is rewritten
 * in ONE pass. Running the replacements one after another would remap
 * `gap-s` → `gap-md`, then that `gap-md` again → `gap-l`.
 *
 * Each old value goes to the nearest new step. The one tie is 8, which sits
 * 2px from both 6 and 10. It splits by job: space BETWEEN things (gap, space,
 * margin, offsets) takes 6, so related items sit closer; space INSIDE a box
 * (padding, sizes) takes 10.
 *
 * Off-scale numerics (`gap-0.5`, `py-10`, `px-7` …) are folded onto the scale
 * the same way. `pr-10` and `pr-12` are left alone: they clear a 40px chevron
 * and a 48px trailing button, so they are sizes, not rhythm.
 *
 * Usage:  node scripts/codemod-golden-spacing.mjs [dir-or-file …]
 *         (defaults to apps and packages/shared/src: .tsx files, plus the
 *         .test.ts files that assert class strings)
 * Running it twice over the same file is NOT safe — it would remap
 * already-remapped classes. On a branch cut before the migration, pass only
 * the files that branch added or changed.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BETWEEN = new Set([
  "gap", "gap-x", "gap-y", "space-x", "space-y",
  "m", "mx", "my", "mt", "mb", "ml", "mr", "ms", "me",
  "top", "bottom", "left", "right", "start", "end",
  "inset", "inset-x", "inset-y", "translate-x", "translate-y",
]);
const PROPS = [
  ...BETWEEN,
  "p", "px", "py", "pt", "pb", "pl", "pr", "ps", "pe",
  "w", "h", "size", "min-w", "min-h", "max-h",
]
  // Longest first, so `gap-x` wins over `gap` and `min-w` over `w`.
  .sort((a, b) => b.length - a.length);

const NAMED = {
  xs: "xs",
  md: "l",
  l: "xl",
  xl: "xl",
  "2xl": "2xl", "3xl": "2xl", "4xl": "2xl",
  "5xl": "3xl", "6xl": "3xl", "7xl": "3xl", "8xl": "3xl",
  "9xl": "4xl", "10xl": "4xl", "11xl": "4xl",
};
const NUMERIC = { "0.5": "xs", 1: "xs", "1.5": "s", 3: "md", 7: "xl", 10: "2xl" };

const tie8 = (prop) => (BETWEEN.has(prop) ? "s" : "md");

function mapValue(prop, value) {
  if (value === "s" || value === "2") return tie8(prop);
  if (value in NAMED) return NAMED[value];
  if (value in NUMERIC) {
    if (prop === "pr" && (value === "10" || value === "12")) return null;
    // Numerics are only folded for rhythm, not for sizes or offsets.
    if (!/^(p|m|gap|space)/.test(prop)) return null;
    return NUMERIC[value];
  }
  return null;
}

const NAMES = "xs|s|md|l|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|10xl|11xl";
const CLASS = new RegExp(
  `(^|[\\s"'\`{(:!])(-?)(${PROPS.join("|")})-(${NAMES}|0\\.5|1\\.5|1|2|3|7|10)(?=$|[\\s"'\`}),])`,
  "gm",
);

/** `<Card padding="l">` and friends name the scale directly. */
const PROP_MAPS = [
  { tag: "Card", attr: "padding", prop: "p" },
  { tag: "Card", attr: "gap", prop: "gap" },
  { tag: "Page", attr: "gap", prop: "gap" },
];

export function transform(src) {
  let out = src.replace(CLASS, (whole, lead, neg, prop, value) => {
    const next = mapValue(prop, value);
    return next ? `${lead}${neg}${prop}-${next}` : whole;
  });
  for (const { tag, attr, prop } of PROP_MAPS) {
    const tagRe = new RegExp(`<${tag}\\b[^>]*>`, "g");
    out = out.replace(tagRe, (open) =>
      open.replace(new RegExp(`\\b${attr}="(${NAMES})"`), (m, v) => {
        const next = mapValue(prop, v);
        return next ? `${attr}="${next}"` : m;
      }),
    );
  }
  return out;
}

function* walk(dir) {
  if (!statSync(dir).isDirectory()) {
    yield dir;
    return;
  }
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (path.endsWith(".tsx") || path.endsWith(".test.ts")) yield path;
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const roots = process.argv.slice(2);
  let changed = 0;
  for (const root of roots.length ? roots : ["apps", "packages/shared/src"]) {
    for (const file of walk(root)) {
      const src = readFileSync(file, "utf8");
      const out = transform(src);
      if (out !== src) {
        writeFileSync(file, out);
        changed++;
      }
    }
  }
  console.log(`golden spacing: rewrote ${changed} files`);
}
