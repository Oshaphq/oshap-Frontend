import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Padding, margin and gap stay on the golden scale (xs s md l xl 2xl 3xl 4xl).
 *
 * Tailwind still compiles `p-4` and `gap-2` — it derives numeric utilities
 * from `--spacing`, and the h-/w- sizes depend on that — so nothing else stops
 * a stray number. That drift is what the scale exists to end.
 */
const ROOT = join(__dirname, "../../../..");
const DIRS = ["apps", "packages/shared/src"];

/** Sizes, not rhythm: they clear a 40px chevron and a 48px trailing button. */
const ALLOWED = new Set(["pr-10", "pr-12"]);

const RHYTHM =
  /(?:^|[\s"'`{(:!])-?((?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y)-(?:\d+(?:\.\d+)?|5xl|6xl|7xl|8xl|9xl|10xl|11xl))(?=$|[\s"'`}),])/gm;

function* tsx(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* tsx(path);
    else if (path.endsWith(".tsx")) yield path;
  }
}

describe("golden spacing scale", () => {
  it("keeps padding, margin and gap on the named steps", () => {
    const offenders: string[] = [];
    for (const dir of DIRS) {
      for (const file of tsx(join(ROOT, dir))) {
        for (const [, cls = ""] of readFileSync(file, "utf8").matchAll(RHYTHM)) {
          if (cls.endsWith("-0") || ALLOWED.has(cls)) continue;
          offenders.push(`${relative(ROOT, file)}: ${cls}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
