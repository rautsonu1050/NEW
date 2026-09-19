import assert from "node:assert/strict";
import test, { after } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  configFile: false,
  appType: "custom",
  root,
  cacheDir: ".wrangler/test-vite",
  resolve: {
    alias: {
      "cloudflare:workers": path.join(root, "tests/fixtures/cloudflare.mjs"),
    },
  },
  server: { middlewareMode: true, hmr: false },
});
after(() => vite.close());
const { buildTrip, recover, incidentTypes, isOpen } = await vite.ssrLoadModule(
  "/src/server/engine.ts",
);
const { defaultPreferences, cities } = await vite.ssrLoadModule(
  "/src/data/cities.ts",
);
const { placeById } = await vite.ssrLoadModule("/src/server/catalog.ts");
const { preferencesSchema } = await vite.ssrLoadModule(
  "/src/lib/validation.ts",
);
const { handle } = await vite.ssrLoadModule("/src/server/controller.ts");
const { saveTrip, getTrip } = await vite.ssrLoadModule(
  "/src/server/repository.ts",
);
const { actor } = await vite.ssrLoadModule("/src/server/auth.ts");
const { env } = await vite.ssrLoadModule("/tests/fixtures/cloudflare.mjs");
function client() {
  let cookie = "";
  return {
    async call(route, body, expected = 200) {
      const response = await handle(
        new Request("http://test.local/api/" + route, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            cookie,
            ...(body === undefined
              ? {}
              : {
                  "Content-Type": "application/json",
                  Origin: "http://test.local",
                }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
      if (response.headers.get("set-cookie"))
        cookie = response.headers.get("set-cookie").split(";")[0];
      const data = await response.json();
      assert.equal(response.status, expected, JSON.stringify(data));
      return data;
    },
    request() {
      return new Request("http://test.local/api/state", {
        headers: { cookie },
      });
    },
  };
}

test("all 11 destinations generate dated, unique, valid schedules and matching totals", () => {
  for (const city of cities) {
    const trip = buildTrip({ ...defaultPreferences(), destination: city.name });
    assert.equal(trip.days.length, 3);
    const ids = [];
    for (const day of trip.days) {
      assert.ok(day.items.length);
      let end = 0;
      for (const item of day.items) {
        const time =
          Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3));
        assert.ok(time >= end + item.travelMinutes, city.name + ": no overlap");
        end = time + item.duration;
        const place = placeById(item.placeId);
        if (place) {
          ids.push(place.id);
          assert.ok(isOpen(place, day.date));
        }
        assert.ok(item.cost >= 0 && Number.isFinite(item.cost));
      }
    }
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(
      trip.estimate,
      Object.values(trip.breakdown).reduce((n, value) => n + value, 0),
    );
    assert.equal(trip.source.status, "demo");
  }
});

test("validation rejects bad dates, reversed ranges, empty interests, oversized groups and budget", () => {
  for (const change of [
    { startDate: "2026-02-30" },
    { endDate: "2000-01-01" },
    { interests: [] },
    { travelers: 21 },
    { budget: -1 },
  ]) {
    assert.equal(
      preferencesSchema.safeParse({ ...defaultPreferences(), ...change })
        .success,
      false,
    );
  }
  const vegan = buildTrip({ ...defaultPreferences(), food: "Vegan" });
  assert.ok(
    vegan.days
      .flatMap((d) => d.items)
      .filter((i) => i.category === "Food")
      .every((i) => /unverified/.test(i.reason)),
  );
});

test("all recovery scenarios preserve unrelated days and provide 3 applicable alternatives", () => {
  const trip = buildTrip(defaultPreferences());
  for (const type of incidentTypes) {
    const options = recover(trip, {
      id: "test",
      type,
      day: 2,
      itemId: trip.days[1].items[0].id,
      delay: 90,
      simulated: true,
    });
    assert.equal(options.length, 3);
    for (const option of options) {
      assert.deepEqual(option.days[0], trip.days[0]);
      assert.deepEqual(option.days[2], trip.days[2]);
      assert.equal(option.baseVersion, trip.version);
      assert.ok(Number.isFinite(option.costDelta));
      assert.ok(option.warnings.length);
    }
  }
});

test("itinerary edits persist, reject stale writers, and recovery applies its exact cost once", async () => {
  const c = client();
  const state = await c.call("state");
  const original = state.trips[0];
  const a = await actor(c.request());
  const left = structuredClone(original),
    right = structuredClone(original);
  left.days[0].items[0].completed = true;
  await saveTrip(a, left);
  right.days[0].items = [];
  await assert.rejects(saveTrip(a, right), /changed in another tab/);
  assert.equal(
    (await getTrip(a, left.id)).days[0].items.length,
    original.days[0].items.length,
  );
  await c.call(
    "trips/update",
    {
      tripId: original.id,
      day: 1,
      version: original.version,
      itemId: original.days[0].items[0].id,
      action: "remove",
    },
    409,
  );
  const current = (await c.call("state")).trips[0];
  const options = await c.call("recovery/preview", {
    tripId: current.id,
    day: 2,
    itemId: current.days[1].items[0].id,
    type: "Attraction closed",
    delay: 90,
    simulated: true,
  });
  const applied = await c.call("recovery/apply", { id: options[1].id });
  assert.equal(applied.estimate, current.estimate + options[1].costDelta);
  assert.deepEqual(applied.days[0], current.days[0]);
  assert.equal(
    (await c.call("recovery/apply", { id: options[1].id })).version,
    applied.version,
  );
  await c.call("recovery/apply", { id: options[0].id }, 409);
});

test("remove, replace, add and time editing change only the selected day", async () => {
  const c = client();
  await c.call("state");
  const prefs = defaultPreferences();
  prefs.endDate = prefs.startDate;
  let trip = await c.call("trips/generate", prefs);
  const removed = trip.days[0].items[0];
  const count = trip.days[0].items.length;
  trip = await c.call("trips/update", {
    tripId: trip.id,
    version: trip.version,
    day: 1,
    action: "remove",
    itemId: removed.id,
  });
  assert.equal(trip.days[0].items.length, count - 1);
  trip = await c.call("trips/update", {
    tripId: trip.id,
    version: trip.version,
    day: 1,
    action: "replace",
    itemId: trip.days[0].items[0].id,
    placeId: removed.placeId,
  });
  assert.ok(trip.days[0].items[0].replaced);
  const cat = await c.call("catalog?city=Delhi");
  const available = cat.places.find(
    (p) =>
      !trip.days[0].items.some((i) => i.placeId === p.id) &&
      isOpen(p, prefs.startDate),
  );
  trip = await c.call("trips/update", {
    tripId: trip.id,
    version: trip.version,
    day: 1,
    action: "add",
    placeId: available.id,
  });
  assert.equal(trip.days[0].items.length, count);
  const last = trip.days[0].items.at(-1);
  await c.call(
    "trips/update",
    {
      tripId: trip.id,
      version: trip.version,
      day: 1,
      action: "time",
      itemId: last.id,
      time: "23:55",
    },
    400,
  );
  const first = trip.days[0].items[0];
  const [h, m] = first.time.split(":").map(Number);
  if (m >= 10) {
    const earlier =
      String(h).padStart(2, "0") + ":" + String(m - 10).padStart(2, "0");
    trip = await c.call("trips/update", {
      tripId: trip.id,
      version: trip.version,
      day: 1,
      action: "time",
      itemId: first.id,
      time: earlier,
    });
    assert.equal(trip.days[0].items[0].time, earlier);
  }
  assert.equal(
    (await c.call("state")).trips.find((t) => t.id === trip.id).version,
    trip.version,
  );
});

test("booking price is server-calculated, confirmation is idempotent and cancellation removes expense", async () => {
  const c = client();
  const state = await c.call("state");
  const cat = await c.call("catalog?city=Delhi");
  const stay = cat.stays[0];
  const order = await c.call("bookings/order", {
    itemId: stay.id,
    tripId: state.trips[0].id,
    type: "Stay",
    date: defaultPreferences().startDate,
    nights: 2,
    guests: 3,
    guest: "Demo QA Traveler",
    amount: 1,
  });
  assert.equal(order.amount, stay.price * 2 * 2);
  const booking = await c.call("bookings/confirm", {
    orderId: order.id,
    amount: 1,
  });
  assert.equal(
    (await c.call("bookings/confirm", { orderId: order.id })).id,
    booking.id,
  );
  assert.equal(
    (await c.call("state")).expenses.filter((e) => e.bookingId === booking.id)
      .length,
    1,
  );
  const stranger = client();
  await stranger.call("state");
  await stranger.call("bookings/cancel", { id: booking.id }, 400);
  await c.call("bookings/cancel", { id: booking.id });
  await c.call("bookings/cancel", { id: booking.id });
  const cancelled = await c.call("state");
  assert.equal(
    cancelled.bookings.find((b) => b.id === booking.id).status,
    "Cancelled",
  );
  assert.equal(
    cancelled.expenses.filter((e) => e.bookingId === booking.id).length,
    0,
  );
});

test("business offers require verification; admin review, offer edits and pauses persist", async () => {
  const c = client();
  await c.call("state");
  await c.call("business/verify", { id: "x", status: "Verified" }, 403);
  await c.call("role", { role: "business" });
  const business = await c.call("business/register", {
    name: "QA Craft Studio",
    owner: "Demo Owner",
    category: "Handicrafts & Textiles",
    address: "Sample Street 12",
    city: "Delhi",
    phone: "+91 9000000000",
  });
  const data = {
    businessId: business.id,
    title: "Local craft lesson",
    description: "A sample traveler craft experience",
    discount: 10,
    timeWindow: "10:00 - 12:00",
    target: "Culture travelers",
  };
  await c.call("business/offer", data, 400);
  await c.call("role", { role: "admin" });
  await c.call("business/verify", {
    id: business.id,
    status: "Verified",
    note: "Demo QA review",
  });
  const analytics = await c.call("analytics");
  assert.ok(analytics.distribution.length);
  await c.call("role", { role: "business" });
  const offer = await c.call("business/offer", data);
  await c.call("business/offer", { ...data, id: offer.id, discount: 15 });
  await c.call("business/offer-toggle", { id: offer.id });
  const updated = (await c.call("state")).offers.find((o) => o.id === offer.id);
  assert.equal(updated.active, false);
  assert.equal(updated.discount, 15);
  await c.call("business/interest", { id: offer.id }, 400);
  await c.call("business/offer", { ...data, id: offer.id, discount: 20 });
  assert.equal(
    (await c.call("state")).offers.find((o) => o.id === offer.id).active,
    false,
  );
  await c.call("business/offer-toggle", { id: offer.id });
  await c.call("business/interest", { id: offer.id });
  await c.call("business/interest", { id: offer.id });
  assert.equal(
    (await c.call("state")).offers.find((o) => o.id === offer.id).clicks,
    1,
  );
});

test("travel tools return explicit demos, audio progress saves, duplicate stamps do not multiply XP", async () => {
  const c = client();
  await c.call("state");
  const flight = await c.call("travel/search", {
    origin: "Mumbai",
    destination: "Delhi",
    date: defaultPreferences().startDate,
    travelers: 2,
    mode: "Flight",
  });
  assert.equal(flight.source.status, "demo");
  const rail = await c.call("travel/search", {
    origin: "Mumbai",
    destination: "Delhi",
    date: defaultPreferences().startDate,
    travelers: 2,
    mode: "Train",
  });
  assert.equal(rail.source.status, "demo");
  await c.call("audio/progress", {
    placeId: "plc_india_gate",
    position: 100,
    language: "English",
  });
  assert.equal(
    (await c.call("audio/progress?placeId=plc_india_gate")).position,
    100,
  );
  await c.call("passport/award", {
    placeId: "plc_india_gate",
    method: "Demo arrival",
  });
  await c.call("passport/award", {
    placeId: "plc_india_gate",
    method: "Demo arrival",
  });
  assert.equal((await c.call("state")).stamps.length, 1);
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Offline test");
  };
  try {
    assert.equal((await c.call("currency")).source.status, "demo");
    assert.equal((await c.call("weather?city=Delhi")).source.status, "demo");
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("production mode disables demo entry and cross-origin writes are rejected", async () => {
  env.DEMO_MODE = "false";
  try {
    await client().call("state", undefined, 401);
  } finally {
    env.DEMO_MODE = "true";
  }
  const response = await handle(
    new Request("http://test.local/api/role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://other.local",
      },
      body: JSON.stringify({ role: "admin" }),
    }),
  );
  assert.equal(response.status, 403);
});
