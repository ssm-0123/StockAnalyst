import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const pagesDir = path.basename(rootDir) === "github-pages-root" ? rootDir : path.join(rootDir, "github-pages-root");
const strict = process.argv.includes("--strict");
const maxAttempts = 3;

function runGit(args) {
  return spawnSync("git", args, {
    cwd: pagesDir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function isDnsFailure(text) {
  return /Could not resolve hostname|Name or service not known|Temporary failure in name resolution|nodename nor servname/i.test(
    text,
  );
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function main() {
  const status = runGit(["status", "--porcelain"]);

  if (status.status !== 0) {
    console.error(status.stderr || status.stdout);
    process.exitCode = strict ? 1 : 0;
    return;
  }

  if (status.stdout.trim()) {
    console.log("[push] github-pages-root has uncommitted changes. Commit them before pushing.");
    console.log(status.stdout.trim());
    process.exitCode = strict ? 1 : 0;
    return;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = runGit(["push", "origin", "main"]);
    const output = `${result.stdout}${result.stderr}`.trim();

    if (result.status === 0) {
      console.log(`[push] success on attempt ${attempt}`);
      if (output) {
        console.log(output);
      }
      return;
    }

    console.log(`[push] attempt ${attempt}/${maxAttempts} failed`);
    if (output) {
      console.log(output);
    }

    if (attempt < maxAttempts && isDnsFailure(output)) {
      sleep(30_000);
    }
  }

  console.log("[push] failed after retries. Local commit remains in github-pages-root.");
  process.exitCode = strict ? 1 : 0;
}

main();
