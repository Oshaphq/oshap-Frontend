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
//
// Two things the first version of this script missed:
//  - Vite loads .env / .env.local from the repo root (envDir in each
//    vite.config.ts) into import.meta.env — those never appear in process.env
//    here, so a token sitting in .env.local sailed through.
//  - When the mistake happens, Vite inlines the VALUE, not the variable name,
//    so a bundle scan for "VITE_PLATFORM_TOKEN" can only fire on odd code like
//    `env.VITE_PLATFORM_TOKEN`. We therefore also scan for known values.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_FILE_NAMES = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
];

// Vite reads env files from the repo root; this script runs from
// apps/platform via the workspace build chain.
const roots = [process.cwd(), join(process.cwd(), "..", "..")];

function findEnvFiles() {
  const found = [];
  for (const root of roots) {
    for (const name of ENV_FILE_NAMES) {
      const p = join(root, name);
      if (existsSync(p)) found.push(p);
    }
  }
  return found;
}

function parseTokenValue(filePath) {
  const match = /^VITE_PLATFORM_TOKEN\s*=\s*(.+)\s*$/.exec(
    readFileSync(filePath, "utf8"),
  );
  return match ? match[1].replace(/^["']|["']$/g, "").trim() : null;
}

const envOffenders = [];
const knownValues = [];

if (process.env.VITE_PLATFORM_TOKEN) {
  envOffenders.push("the process environment");
} else {
  for (const filePath of findEnvFiles()) {
    const value = parseTokenValue(filePath);
    if (!value) continue;
    envOffenders.push(filePath);
    knownValues.push(value);
  }
}

if (envOffenders.length) {
  console.error(
    `\n  VITE_PLATFORM_TOKEN is set in: ${envOffenders.join(", ")}\n` +
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

const needles = ["VITE_PLATFORM_TOKEN", ...knownValues];
const offenders = files.filter((f) => {
  const contents = readFileSync(join(dir, f), "utf8");
  return needles.some((n) => contents.includes(n));
});

if (offenders.length) {
  console.error(
    `\n  Platform token reference found in built output: ${offenders.join(", ")}\n`,
  );
  process.exit(1);
}

console.log(`  no platform token in ${files.length} bundled file(s)`);
