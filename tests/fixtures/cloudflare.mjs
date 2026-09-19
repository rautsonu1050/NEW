import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
const database = new DatabaseSync(":memory:");
database.exec("PRAGMA foreign_keys = ON");
database.exec(
  readFileSync(
    new URL("../../drizzle/0000_dry_firebrand.sql", import.meta.url),
    "utf8",
  ),
);
class Statement {
  constructor(sql, values = []) {
    this.sql = sql;
    this.values = values;
  }
  bind(...values) {
    return new Statement(this.sql, values);
  }
  async first() {
    return database.prepare(this.sql).get(...this.values) ?? null;
  }
  async all() {
    const results = database.prepare(this.sql).all(...this.values);
    return {
      success: true,
      results,
      meta: { changes: database.prepare("SELECT changes() AS n").get().n },
    };
  }
  async run() {
    const result = database.prepare(this.sql).run(...this.values);
    return {
      success: true,
      results: [],
      meta: { changes: Number(result.changes) },
    };
  }
}
export const env = {
  DEMO_MODE: "true",
  DB: {
    prepare(sql) {
      return new Statement(sql);
    },
    async batch(statements) {
      database.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    async exec(sql) {
      database.exec(sql);
    },
  },
};
