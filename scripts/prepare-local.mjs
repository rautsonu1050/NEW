import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const config = path.join(root, ".wrangler", "local.config.json");
await mkdir(path.dirname(config), { recursive: true });
await writeFile(
  config,
  JSON.stringify({
    name: "yatra-local",
    compatibility_date: "2026-04-01",
    d1_databases: [
      {
        binding: "DB",
        database_name: "site-creator-d1",
        database_id: "00000000-0000-4000-8000-000000000000",
        migrations_dir: path.join(root, "drizzle"),
      },
    ],
  }),
);
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules", "wrangler", "bin", "wrangler.js"),
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    config,
    "--persist-to",
    path.join(root, ".wrangler", "state"),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
