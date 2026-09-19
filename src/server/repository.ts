import type {
  State,
  Trip,
  TripDay,
  Item,
  Booking,
  Expense,
  Business,
  Offer,
  Profile,
  Notice,
} from "../lib/types";
import type { Actor } from "./auth";
import {
  binding,
  rows,
  first,
  run,
  records,
  parseData,
  putRecord,
  setting,
} from "./db";
import { buildTrip } from "./engine";
import { defaultPreferences } from "../data/cities";
export async function getTrip(a: Actor, id: string): Promise<Trip> {
  const t = await first<{ data: string; version: number }>(
    "SELECT data,version FROM trips WHERE id = ? AND user_id = ?",
    id,
    a.userId,
  );
  if (!t)
    throw Object.assign(new Error("This trip was not found."), { status: 404 });
  const trip = JSON.parse(t.data) as Trip;
  trip.version = t.version;
  const days = await rows<{
    id: string;
    number: number;
    date: string;
    title: string;
  }>(
    "SELECT id,number,date,title FROM trip_days WHERE trip_id = ? ORDER BY number",
    id,
  );
  const items = await rows<{ day_id: string; data: string }>(
    "SELECT i.day_id,i.data FROM itinerary_items i JOIN trip_days d ON d.id = i.day_id WHERE d.trip_id = ? ORDER BY d.number,i.position",
    id,
  );
  trip.days = days.map((d) => ({
    number: d.number,
    date: d.date,
    title: d.title,
    items: items.filter((i) => i.day_id === d.id).map(parseData<Item>),
  }));
  return trip;
}
export async function saveTrip(a: Actor, t: Trip, create = false) {
  const db = binding();
  const { days, ...meta } = t;
  const expected = t.version;
  const next = create ? expected : expected + 1;
  const statements: D1PreparedStatement[] = [];
  // Every child mutation checks the same version inside D1's atomic batch.
  // The version advances last, so a stale editor cannot overwrite any day.
  const guard =
    "EXISTS (SELECT 1 FROM trips WHERE id = ? AND user_id = ? AND version = ?)";
  const args = [t.id, a.userId, expected];
  if (create)
    statements.push(
      db
        .prepare(
          "INSERT INTO trips (id,user_id,data,version,created_at) VALUES (?,?,?,?,?)",
        )
        .bind(
          t.id,
          a.userId,
          JSON.stringify({ ...meta, days: [] }),
          expected,
          t.createdAt,
        ),
    );
  else
    statements.push(
      db
        .prepare("DELETE FROM trip_days WHERE trip_id = ? AND " + guard)
        .bind(t.id, ...args),
    );
  for (const d of days) {
    const dayId = t.id + ":" + d.number;
    statements.push(
      db
        .prepare(
          "INSERT INTO trip_days (id,trip_id,number,date,title) SELECT ?,?,?,?,? WHERE " +
            guard,
        )
        .bind(dayId, t.id, d.number, d.date, d.title, ...args),
    );
    d.items.forEach((item, i) =>
      statements.push(
        db
          .prepare(
            "INSERT INTO itinerary_items (id,day_id,position,data) SELECT ?,?,?,? WHERE " +
              guard,
          )
          .bind(item.id, dayId, i, JSON.stringify(item), ...args),
      ),
    );
  }
  if (!create)
    statements.push(
      db
        .prepare(
          "UPDATE trips SET data = ?,version = ? WHERE id = ? AND user_id = ? AND version = ?",
        )
        .bind(
          JSON.stringify({ ...meta, version: next, days: [] }),
          next,
          ...args,
        ),
    );
  const result = await db.batch(statements);
  if (!create && !result[result.length - 1].meta.changes)
    throw Object.assign(
      new Error("This trip changed in another tab. Reload and try again."),
      { status: 409 },
    );
  t.version = next;
  return t;
}
export async function notify(
  a: Actor,
  title: string,
  message: string,
  category = "TRIP_UPDATE",
  href?: string,
) {
  const id = crypto.randomUUID();
  await putRecord(a.userId, "notification", id, {
    id,
    title,
    message,
    category,
    href,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
export async function bootstrap(a: Actor): Promise<State> {
  const u = await first<{
    profile: string;
    active_trip_id: string | null;
    onboarding: number;
  }>(
    "SELECT profile,active_trip_id,onboarding FROM users WHERE id = ?",
    a.userId,
  );
  if (!u) throw new Error("Profile not found.");
  const ids = await rows<{ id: string }>(
    "SELECT id FROM trips WHERE user_id = ? ORDER BY created_at DESC LIMIT 40",
    a.userId,
  );
  const [
    trips,
    bookings,
    expenses,
    notifications,
    stamps,
    favorites,
    businesses,
    offers,
    chat,
    routes,
  ] = await Promise.all([
    Promise.all(ids.map((t) => getTrip(a, t.id))),
    rows<{ data: string }>(
      "SELECT data FROM bookings WHERE user_id = ? ORDER BY rowid DESC LIMIT 200",
      a.userId,
    ).then((x) => x.map(parseData<Booking>)),
    rows<{ data: string }>(
      "SELECT data FROM expenses WHERE user_id = ? ORDER BY rowid DESC LIMIT 300",
      a.userId,
    ).then((x) => x.map(parseData<Expense>)),
    records<Notice>(a.userId, "notification"),
    records<State["stamps"][number]>(a.userId, "stamp"),
    records<string>(a.userId, "favorite"),
    rows<{ data: string; user_id: string }>(
      "SELECT data,user_id FROM businesses WHERE scope = ? ORDER BY rowid DESC LIMIT 200",
      a.scope,
    ).then((x) =>
      x.map((row) => {
        const b = parseData<Business>(row);
        const canManage = row.user_id === a.userId;
        if (!canManage && a.role !== "admin") delete b.document;
        return { ...b, canManage };
      }),
    ),
    rows<{ data: string }>(
      "SELECT data FROM business_offers WHERE scope = ? ORDER BY rowid DESC LIMIT 200",
      a.scope,
    ).then((x) => x.map(parseData<Offer>)),
    records<State["chat"][number]>(a.userId, "chat"),
    records<State["routes"][number]>(a.userId, "route"),
  ]);
  return {
    profile: JSON.parse(u.profile),
    role: a.role,
    demo: a.demo,
    authConfigured: !!setting("SUPABASE_URL") && !!setting("SUPABASE_ANON_KEY"),
    trips,
    activeTripId: u.active_trip_id,
    bookings,
    expenses,
    notifications,
    stamps,
    favorites,
    businesses,
    offers,
    chat: chat.reverse(),
    routes,
    onboarding: !!u.onboarding,
  };
}
export async function sampleTrip(a: Actor) {
  const t = buildTrip(defaultPreferences());
  await saveTrip(a, t, true);
  await run("UPDATE users SET active_trip_id = ? WHERE id = ?", t.id, a.userId);
  await notify(
    a,
    "Your Delhi journey is ready",
    "A sample itinerary is saved. Explore it, edit a stop, or try a recovery scenario.",
    "TRIP_UPDATE",
    "/traveler/trips/" + t.id,
  );
  return t;
}
