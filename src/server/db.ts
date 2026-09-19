import { env } from "cloudflare:workers";
export function binding(): D1Database {
  if (!env.DB)
    throw new Error("Database is unavailable. Please try again shortly.");
  return env.DB;
}
export function setting(key: string) {
  return (
    (env as unknown as Record<string, string>)[key] || process.env[key] || ""
  );
}
export async function rows<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  const r = await binding()
    .prepare(sql)
    .bind(...args)
    .all();
  return r.results as T[];
}
export async function first<T>(
  sql: string,
  ...args: unknown[]
): Promise<T | null> {
  return (await binding()
    .prepare(sql)
    .bind(...args)
    .first()) as T | null;
}
export async function run(sql: string, ...args: unknown[]) {
  return binding()
    .prepare(sql)
    .bind(...args)
    .run();
}
export const parseData = <T>(v: { data: string }) => JSON.parse(v.data) as T;
export async function records<T>(userId: string, kind: string) {
  return (
    await rows<{ data: string }>(
      "SELECT data FROM records WHERE user_id = ? AND kind = ? ORDER BY rowid DESC LIMIT 200",
      userId,
      kind,
    )
  ).map(parseData<T>);
}
export async function putRecord(
  userId: string,
  kind: string,
  key: string,
  data: unknown,
) {
  await run(
    "INSERT INTO records (id,user_id,kind,key,data) VALUES (?,?,?,?,?) ON CONFLICT(user_id,kind,key) DO UPDATE SET data = excluded.data",
    crypto.randomUUID(),
    userId,
    kind,
    key,
    JSON.stringify(data),
  );
}
export async function deleteRecord(userId: string, kind: string, key: string) {
  await run(
    "DELETE FROM records WHERE user_id = ? AND kind = ? AND key = ?",
    userId,
    kind,
    key,
  );
}
export async function rateLimit(key: string, limit = 30) {
  const window = Math.floor(Date.now() / 60000);
  const k = key + ":" + window;
  const r = await first<{ count: number }>(
    "INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    k,
    Date.now() + 120000,
  );
  if ((r?.count || 0) > limit)
    throw Object.assign(
      new Error("Please wait a minute before trying again."),
      { status: 429 },
    );
  if (window % 10 === 0)
    await run("DELETE FROM rate_limits WHERE expires < ?", Date.now());
}
