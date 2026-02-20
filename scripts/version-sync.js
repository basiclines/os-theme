#!/usr/bin/env node
// scripts/version-sync.js — Sync version across main + platform packages
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const mainPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = mainPkg.version;

const platforms = ["darwin-arm64", "linux-x64", "win32-x64"];

for (const platform of platforms) {
  const pkgPath = join(root, "npm", platform, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  ${pkg.name}@${version}`);
}

// Update optionalDependencies in main package
for (const platform of platforms) {
  const name = `@os-theme/${platform}`;
  mainPkg.optionalDependencies[name] = version;
}
writeFileSync(join(root, "package.json"), JSON.stringify(mainPkg, null, 2) + "\n");
console.log(`  os-theme@${version} (optionalDependencies updated)`);
