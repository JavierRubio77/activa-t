import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const bin = (name) => join(root, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
const runOptions = { stdio: "inherit", shell: process.platform === "win32" };
const tsc = bin("tsc");
const vinext = bin("vinext");
if (!existsSync(tsc) || !existsSync(vinext)) throw new Error("Faltan dependencias. Ejecuta pnpm install.");
console.log("Checking TypeScript references...");
execFileSync(tsc, ["--noEmit"], runOptions);
console.log("Running vinext build...");
execFileSync(vinext, ["build"], { ...runOptions, env: { ...process.env, WRANGLER_WRITE_LOGS: "false" } });
const generatedConfig = join(root, "dist", "server", "wrangler.json");
if (existsSync(generatedConfig)) {
  const config = JSON.parse(readFileSync(generatedConfig, "utf8"));
  delete config.legacy_env;
  delete config.d1_databases;
  writeFileSync(generatedConfig, `${JSON.stringify(config)}\n`);
}
