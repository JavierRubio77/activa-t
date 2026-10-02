import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const server = join(root, "dist", "server");
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
if (!existsSync(join(server, "index.js")) || !existsSync(join(root, "dist", "client"))) {
  throw new Error("Falta dist/. Ejecuta npm run build antes de publicar.");
}
const configPath = join(server, "wrangler-activa-t.json");
writeFileSync(configPath, `${JSON.stringify({
  $schema: "../../node_modules/wrangler/config-schema.json",
  name: "activa-t",
  main: "index.js",
  compatibility_date: "2026-10-02",
  compatibility_flags: ["nodejs_compat"],
  assets: { directory: "../client", binding: "ASSETS" },
  images: { binding: "IMAGES" },
  observability: { enabled: true },
}, null, 2)}\n`);
const logPath = join(root, ".wrangler", "deploy-logs");
mkdirSync(logPath, { recursive: true });
execFileSync(process.execPath, [wrangler, "deploy", "--config", "wrangler-activa-t.json"], {
  cwd: server,
  stdio: "inherit",
  env: { ...process.env, WRANGLER_LOG_PATH: logPath },
});
