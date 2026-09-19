import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";

test("deployable Worker includes database bindings, generated migrations and essential assets", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../dist/.openai/hosting.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.d1, "DB");
  assert.equal(manifest.r2, "BUCKET");
  for (const name of [
    "server/index.js",
    ".openai/drizzle/0000_dry_firebrand.sql",
    "client/images/delhi.webp",
    "client/vendor/leaflet.js",
    "client/vendor/qrcode.js",
  ]) {
    await access(new URL("../dist/" + name, import.meta.url));
  }
  const migration = await readFile(
    new URL("../dist/.openai/drizzle/0000_dry_firebrand.sql", import.meta.url),
    "utf8",
  );
  for (const name of [
    "trips",
    "trip_days",
    "itinerary_items",
    "bookings",
    "expenses",
    "businesses",
    "business_offers",
  ]) {
    assert.ok(
      migration.includes("CREATE TABLE `" + name + "`"),
      "Missing persistent " + name + " table",
    );
  }
});
