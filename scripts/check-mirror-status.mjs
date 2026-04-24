import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const pagesDir = path.basename(rootDir) === "github-pages-root" ? rootDir : path.join(rootDir, "github-pages-root");
const strict = process.argv.includes("--strict");

function git(args) {
  return execFileSync("git", args, {
    cwd: pagesDir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function main() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const head = git(["rev-parse", "--short", "HEAD"]);
  const status = git(["status", "--porcelain"]);

  console.log(`[mirror] branch=${branch} head=${head}`);

  if (!status) {
    console.log("[mirror] clean: github-pages-root에 미커밋 변경이 없습니다.");
    return;
  }

  const lines = status.split("\n");
  console.log(`[mirror] dirty: ${lines.length}개 변경이 남아 있습니다.`);

  for (const line of lines.slice(0, 40)) {
    console.log(`  ${line}`);
  }

  if (lines.length > 40) {
    console.log(`  ... 그 외 ${lines.length - 40}건`);
  }

  if (strict) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
