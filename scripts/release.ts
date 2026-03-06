#!/usr/bin/env bun
/**
 * Release script for os-theme
 * Usage: bun run release <version>
 * Example: bun run release 0.0.6
 *
 * Publishes os-theme + platform packages (@os-theme/darwin-arm64, etc.)
 * npm publish is handled by GitHub Actions via OIDC trusted publishing.
 */

import { $ } from "bun";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SCRIPTS_DIR = import.meta.dir;
const ROOT_DIR = join(SCRIPTS_DIR, "..");

async function main() {
  const version = process.argv[2];

  if (!version) {
    console.error("Usage: bun run release <version>");
    console.error("Example: bun run release 0.0.6");
    process.exit(1);
  }

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Invalid version format: ${version}`);
    console.error("Expected format: X.Y.Z (e.g., 0.0.6)");
    process.exit(1);
  }

  console.log(`\n🚀 Releasing os-theme v${version}\n`);

  // Step 1: Run tests
  console.log("🧪 Running tests...");
  try {
    await $`bun test`.cwd(ROOT_DIR);
    console.log("✅ Tests passed!\n");
  } catch {
    console.error("❌ Tests failed! Aborting release.");
    process.exit(1);
  }

  // Step 2: Update version in package.json
  console.log("📦 Updating version...");
  const packageJsonPath = join(ROOT_DIR, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

  // Step 3: Sync version to platform packages + optionalDependencies
  console.log("🔄 Syncing platform package versions...");
  await $`node scripts/version-sync.js`.cwd(ROOT_DIR);

  // Step 4: Build TypeScript → dist/
  console.log("🔨 Building dist...");
  await $`bun run build`.cwd(ROOT_DIR);

  // Step 5: Commit and tag
  console.log("📌 Creating git commit and tag...");
  await $`git add -A`.cwd(ROOT_DIR);
  await $`git commit -m ${"Bump version to " + version}`.cwd(ROOT_DIR);
  await $`git tag ${"v" + version}`.cwd(ROOT_DIR);
  await $`git push origin main`.cwd(ROOT_DIR);
  await $`git push origin ${"v" + version}`.cwd(ROOT_DIR);

  // Step 6: Create GitHub release
  console.log("🎉 Creating GitHub release...");
  const releaseNotes = `## os-theme v${version}

### Installation

\`\`\`bash
npm install os-theme
\`\`\`
`;

  await $`gh release create ${"v" + version} \
    --title ${"v" + version} \
    --notes ${releaseNotes}`.cwd(ROOT_DIR);

  // Step 7: npm publish is handled by GitHub Actions
  console.log("📦 npm publish will be handled by CI (trusted publisher via OIDC)...");
  console.log("   The v-tag push triggers .github/workflows/release.yml");

  console.log(`
✅ Release v${version} complete!

📦 GitHub Release: https://github.com/basiclines/os-theme/releases/tag/v${version}
📦 npm: https://www.npmjs.com/package/os-theme
`);
}

main().catch((error) => {
  console.error("❌ Release failed:", error.message);
  process.exit(1);
});
