// Fails the build if a platform token was baked into the bundle.
//
// A guard against a mistake that has already been made once: setting
// VITE_PLATFORM_TOKEN in a hosting provider's environment. Vite inlines every
// VITE_-prefixed variable as a literal, so the secret that administers every
// tenant would ship inside a publicly downloadable JS file, readable by anyone
// who opens devtools.
//
// The app no longer reads that variable, so the only way it reaches a bundle is
// if someone reintroduces it. This makes that fail loudly at build time rather
// than silently in production.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

if (process.env.VITE_PLATFORM_TOKEN) {
  console.error(
    "\n  VITE_PLATFORM_TOKEN is set in this build environment.\n" +
      "  Remove it. The operator types the access code at the login screen;\n" +
      "  a VITE_ variable would be inlined into the public bundle.\n",
  );
  process.exit(1);
}

const dir = join(process.cwd(), "dist", "assets");
let files = [];
try {
  files = readdirSync(dir).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`  Could not read ${dir} — did the build run?`);
  process.exit(1);
}

const offenders = files.filter((f) =>
  readFileSync(join(dir, f), "utf8").includes("VITE_PLATFORM_TOKEN"),
);

if (offenders.length) {
  console.error(
    `\n  Platform token reference found in built output: ${offenders.join(", ")}\n`,
  );
  process.exit(1);
}

console.log(`  no platform token in ${files.length} bundled file(s)`);
