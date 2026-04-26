import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const pagesDir = path.join(rootDir, "github-pages-root");

const pathsToSync = [
  "app",
  "components",
  "lib",
  "launchd",
  "public",
  "scripts",
  "tests",
  "AUTOMATION_PROMPT.md",
  "AUTOMATION_PROMPT.txt",
  "AUTOMATION_RUN_PROMPT.txt",
  "RESULTS_AUTOMATION_PROMPT.md",
  "RESULTS_AUTOMATION_PROMPT.txt",
  "RESULTS_AUTOMATION_RUN_PROMPT.txt",
  "README.md",
  "developmentmemory.md",
  "next-env.d.ts",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "postcss.config.js",
  "tailwind.config.ts",
  "tsconfig.json",
];

async function copyPath(relativePath) {
  const sourcePath = path.join(rootDir, relativePath);
  const targetPath = path.join(pagesDir, relativePath);
  const stats = await fs.stat(sourcePath);

  await fs.rm(targetPath, { recursive: true, force: true });

  if (stats.isDirectory()) {
    await fs.cp(sourcePath, targetPath, { recursive: true });
    return;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

async function main() {
  for (const relativePath of pathsToSync) {
    await copyPath(relativePath);
  }

  console.log("Synced root app into github-pages-root.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
