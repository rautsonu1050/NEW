export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const id = () => crypto.randomUUID();
export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (date: string, days: number) =>
  new Date(new Date(date + "T12:00:00Z").getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);
export const dateLabel = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
export function distance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const r = Math.PI / 180;
  const x =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return (
    Math.round(6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10
  );
}
export const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const clock = (n: number) =>
  `${Math.floor(Math.min(1439, n) / 60)
    .toString()
    .padStart(2, "0")}:${(Math.min(1439, n) % 60).toString().padStart(2, "0")}`;
export const toggle = <T>(a: T[], v: T) =>
  a.includes(v) ? a.filter((x) => x !== v) : [...a, v];
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Unable to save. Please try again.");
  return data;
}
