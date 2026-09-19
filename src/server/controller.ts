/**
 * Core API Controller
 *
 * Handles routing and logic for all incoming API requests,
 * including bookings, expenses, profile updates, and trips.
 */
import { z } from "zod";
import { env } from "cloudflare:workers";
import {
  actor,
  authenticate,
  checkOrigin,
  requireRole,
  switchRole,
  type Actor,
} from "./auth";
import {
  binding,
  first,
  rows,
  run,
  records,
  putRecord,
  deleteRecord,
  setting,
  rateLimit,
  parseData,
} from "./db";
import { bootstrap, getTrip, saveTrip, notify, sampleTrip } from "./repository";
import {
  getCatalog,
  placeById,
  stayById,
  experienceById,
  cities,
  allPlaces,
} from "./catalog";
import {
  generate,
  weather,
  currency,
  mapRoute,
  flights,
  trains,
  integrations,
  gemini,
  paymentProvider,
} from "./providers";
import {
  preferencesSchema,
  profileSchema,
  expenseSchema,
  bookingSchema,
  businessSchema,
  offerSchema,
} from "../lib/validation";
import {
  budget,
  schedule,
  itemFor,
  recover,
  incidentTypes,
  demoSource,
  health,
} from "./engine";
import { distance, id, today, minutes } from "../lib/utils";
import type {
  Trip,
  Recovery,
  Incident,
  Booking,
  Expense,
  Business,
  Offer,
  Notice,
  ChatMessage,
} from "../lib/types";
function error(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
const str = (v: unknown, max = 200) => z.string().min(1).max(max).parse(v);
/** Initializes a demo workspace with sample data and businesses if the user is in demo mode. */
async function initDemo(actor: Actor) {
  if (!actor.demo) return;
  const seeded = await first(
    "SELECT id FROM records WHERE user_id = ? AND kind = ? AND key = ?",
    actor.userId,
    "system",
    "seeded",
  );
  if (seeded) return;
  await putRecord(actor.userId, "system", "seeded", true);
  await sampleTrip(actor);
  const now = new Date().toISOString();
  const biz: Business = {
    id: id(),
    name: "Heritage Kitchen (demo)",
    owner: "Aarav Mehra",
    category: "Local Restaurant",
    address: "Chandni Chowk, Old Delhi",
    city: "Delhi",
    phone: "+91 90000 00000",
    status: "Verified",
    createdAt: now,
  };
  await run(
    "INSERT INTO businesses (id,user_id,scope,data) VALUES (?,?,?,?)",
    biz.id,
    actor.userId,
    actor.scope,
    JSON.stringify(biz),
  );
  for (const [name, category] of [
    ["Old Delhi Artisan Studio (demo)", "Handicrafts & Textiles"],
    ["Mehrauli Heritage Walks (demo)", "Licensed Tour Guide"],
  ]) {
    const b = { ...biz, id: id(), name, category, status: "Pending" };
    await run(
      "INSERT INTO businesses (id,user_id,scope,data) VALUES (?,?,?,?)",
      b.id,
      actor.userId,
      actor.scope,
      JSON.stringify(b),
    );
  }
  const offer: Offer = {
    id: id(),
    businessId: biz.id,
    title: "A taste of Old Delhi",
    description:
      "Enjoy a traditional vegetarian thali after your heritage walk.",
    discount: 20,
    price: 450,
    food: "Special North Indian Royal Thali",
    location: "Chandni Chowk",
    lat: 28.6506,
    lng: 77.2303,
    timeWindow: "12:00 - 15:00",
    target: "Travelers exploring Old Delhi",
    active: true,
    clicks: 0,
    createdAt: now,
  };
  await run(
    "INSERT INTO business_offers (id,business_id,scope,data) VALUES (?,?,?,?)",
    offer.id,
    biz.id,
    actor.scope,
    JSON.stringify(offer),
  );
}
/** Finalizes a booking order after payment success, creating booking and expense records. */
async function bookingComplete(
  actor: Actor,
  orderId: string,
  paymentId?: string,
  signature?: string,
) {
  const record = await first<{ data: string; status: string }>(
    "SELECT data,status FROM payment_orders WHERE id = ? AND user_id = ?",
    orderId,
    actor.userId,
  );
  if (!record) error("Order not found", 404);
  const existing = await first<{ data: string }>(
    "SELECT data FROM bookings WHERE order_id = ? AND user_id = ?",
    orderId,
    actor.userId,
  );
  if (existing) return JSON.parse(existing.data);
  const order = JSON.parse(record.data);
  if (order.payment === "demo" && !actor.demo)
    error("Demo checkout requires a demo session.", 403);
  if (order.payment === "test") {
    if (!paymentId || !signature) error("Payment verification is required.");
    const payment = await paymentProvider.verify(orderId, paymentId, signature);
    if (
      payment.order_id !== orderId ||
      payment.amount !== order.amount * 100 ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    )
      error(
        "Payment is not captured or does not match this order. Please check its status before retrying.",
      );
  }
  const now = new Date().toISOString();
  const booking: Booking = {
    ...order,
    id: id(),
    code: "YATRA-" + id().slice(0, 8).toUpperCase(),
    status: "Confirmed",
    paymentId,
    createdAt: now,
  };
  const expense: Expense = {
    id: id(),
    tripId: booking.tripId,
    title: booking.title,
    amount: booking.amount,
    category: booking.type === "Stay" ? "Stay" : "Activities",
    method: order.payment === "demo" ? "Demo" : "Razorpay test",
    notes: "Booking " + booking.code,
    date: today(),
    bookingId: booking.id,
  };
  await binding().batch([
    binding()
      .prepare(
        "INSERT INTO bookings (id,user_id,trip_id,order_id,data) VALUES (?,?,?,?,?)",
      )
      .bind(
        booking.id,
        actor.userId,
        booking.tripId,
        orderId,
        JSON.stringify(booking),
      ),
    binding()
      .prepare(
        "INSERT INTO expenses (id,user_id,trip_id,booking_id,data) VALUES (?,?,?,?,?)",
      )
      .bind(
        expense.id,
        actor.userId,
        booking.tripId,
        booking.id,
        JSON.stringify(expense),
      ),
    binding()
      .prepare(
        "UPDATE payment_orders SET status = ? WHERE id = ? AND user_id = ?",
      )
      .bind("complete", orderId, actor.userId),
  ]);
  await notify(
    actor,
    "Booking saved",
    booking.title +
      " has been added to your " +
      (booking.payment === "demo" ? "demo" : "test") +
      " bookings.",
    "BOOKING",
    "/bookings",
  );
  return booking;
}
/**
 * Main POST request handler. Routes actions based on the path parameter.
 * @param path - The API endpoint path
 * @param request - The incoming Request object
 * @param actor - The authenticated user performing the action
 * @param payload - The body of the request
 */
async function post(
  path: string,
  request: Request,
  actor: Actor,
  payload: any,
): Promise<unknown> {
  if (path === "role") {
    const role = z
      .enum(["traveler", "business", "admin", "authority"])
      .parse(payload.role);
    await switchRole(request, actor, role);
    return { ok: true };
  }
  if (path === "profile") {
    const profile = profileSchema.parse(payload.profile);
    await run(
      "UPDATE users SET profile = ? WHERE id = ?",
      JSON.stringify(profile),
      actor.userId,
    );
    return { ok: true };
  }
  if (path === "onboarding") {
    await run("UPDATE users SET onboarding = 1 WHERE id = ?", actor.userId);
    return { ok: true };
  }
  if (path === "trips/sample") {
    if (!actor.demo) error("Samples are available in demo sessions only.", 403);
    return sampleTrip(actor);
  }
  if (path === "trips/generate") {
    await rateLimit(actor.userId + ":generate", 6);
    const p = preferencesSchema.parse(payload);
    const t = await generate(p);
    await saveTrip(actor, t, true);
    await run(
      "UPDATE users SET active_trip_id = ? WHERE id = ?",
      t.id,
      actor.userId,
    );
    await notify(
      actor,
      "Your next chapter is ready",
      t.title + " is saved to My Trips.",
      "TRIP_UPDATE",
      "/traveler/trips/" + t.id,
    );
    return t;
  }
  if (path === "trips/active") {
    await getTrip(actor, str(payload.tripId));
    await run(
      "UPDATE users SET active_trip_id = ? WHERE id = ?",
      payload.tripId,
      actor.userId,
    );
    return { ok: true };
  }
  if (path === "trips/delete") {
    await getTrip(actor, str(payload.tripId));
    await binding().batch([
      binding()
        .prepare(
          "UPDATE users SET active_trip_id = NULL WHERE id = ? AND active_trip_id = ?",
        )
        .bind(actor.userId, payload.tripId),
      binding()
        .prepare(
          "UPDATE bookings SET trip_id = NULL,data = json_set(data,'$.tripId',NULL) WHERE trip_id = ? AND user_id = ?",
        )
        .bind(payload.tripId, actor.userId),
      binding()
        .prepare(
          "UPDATE expenses SET trip_id = NULL,data = json_set(data,'$.tripId',NULL) WHERE trip_id = ? AND user_id = ?",
        )
        .bind(payload.tripId, actor.userId),
      binding()
        .prepare(
          "DELETE FROM records WHERE user_id = ? AND kind = ? AND json_extract(data,'$.tripId') = ?",
        )
        .bind(actor.userId, "route", payload.tripId),
      binding()
        .prepare("DELETE FROM trips WHERE id = ? AND user_id = ?")
        .bind(payload.tripId, actor.userId),
    ]);
    return { ok: true };
  }
  if (path === "trips/update") {
    const t = await getTrip(actor, str(payload.tripId));
    if (t.version !== payload.version)
      error("This itinerary changed. Reload and try again.", 409);
    const d = t.days.find((x) => x.number === payload.day);
    if (!d) error("Trip day not found.");
    const at = d.items.findIndex((x) => x.id === payload.itemId);
    if (payload.action === "remove") {
      if (at < 0) error("Activity not found.");
      d.items.splice(at, 1);
    } else if (payload.action === "complete") {
      if (at < 0) error("Activity not found.");
      d.items[at].completed = !d.items[at].completed;
    } else if (payload.action === "time") {
      const time = z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .parse(payload.time);
      if (at < 0) error("Activity not found.");
      d.items[at].time = time;
      d.items.sort((x, y) => x.time.localeCompare(y.time));
      const res = schedule(d.items, t.preferences, d.date, 480, true);
      if (
        res.length !== d.items.length ||
        res.some((item, i) => item.time !== d.items[i].time)
      )
        error(
          "This time overlaps another activity or falls outside the sample opening hours.",
        );
      d.items = res;
    } else if (payload.action === "replace" || payload.action === "add") {
      const p = placeById(str(payload.placeId));
      if (!p || p.city !== t.preferences.destination)
        error("Choose a place in the trip destination.");
      if (t.days.some((day) => day.items.some((i) => i.placeId === p.id)))
        error("This place is already in your itinerary.");
      const item = itemFor(p, t.preferences);
      if (payload.action === "replace") {
        if (at < 0) error("Activity not found.");
        item.replaced = true;
        item.originalTitle = d.items[at].title;
        d.items[at] = item;
      } else d.items.push(item);
    } else if (payload.action === "optimize") {
      const pending = [...d.items];
      const order = [];
      let cur = pending.shift();
      while (cur) {
        order.push(cur);
        const last = cur;
        pending.sort((x, y) => distance(last, x) - distance(last, y));
        cur = pending.shift();
      }
      d.items = order;
    } else error("Unknown itinerary action.");
    if (!["time", "complete"].includes(payload.action)) {
      const next = schedule(d.items, t.preferences, d.date);
      if (next.length < d.items.length)
        error(
          "These activities cannot all fit within their sample opening hours. Remove a stop or choose another day.",
        );
      d.items = next;
    }
    budget(t);
    await saveTrip(actor, t);
    return t;
  }
  if (path === "recovery/preview") {
    const t = await getTrip(actor, str(payload.tripId));
    const inc: Incident = {
      id: id(),
      type: z.enum(incidentTypes as [string, ...string[]]).parse(payload.type),
      day: z.number().int().min(1).max(14).parse(payload.day),
      itemId: str(payload.itemId),
      delay: z.number().int().min(0).max(720).parse(payload.delay),
      simulated: !!payload.simulated,
    };
    if (inc.simulated && !actor.demo)
      error("Simulations are available in demo mode only.", 403);
    const options = recover(t, inc);
    for (const opt of options)
      await putRecord(actor.userId, "recovery", opt.id, opt);
    await putRecord(actor.userId, "incident", inc.id, { ...inc, tripId: t.id });
    return options;
  }
  if (path === "recovery/apply") {
    const r = await first<{ data: string }>(
      "SELECT data FROM records WHERE user_id = ? AND kind = ? AND key = ?",
      actor.userId,
      "recovery",
      str(payload.id),
    );
    if (!r) error("Recovery option expired. Generate new options.");
    const opt = JSON.parse(r.data) as Recovery;
    const t = await getTrip(actor, opt.tripId);
    if (t.recoveryIds.includes(opt.id)) return t;
    if (t.version !== opt.baseVersion)
      error("Your trip has changed. Generate fresh recovery options.", 409);
    const targetEstimate = t.estimate + opt.costDelta;
    t.days = opt.days;
    budget(t);
    t.breakdown.Transport = Math.max(
      0,
      t.breakdown.Transport + targetEstimate - t.estimate,
    );
    budget(t);
    t.recoveryIds.push(opt.id);
    t.notes.unshift(
      `${opt.mode} recovery applied for ${opt.incident.type.toLowerCase()}. Existing reservations are unchanged.`,
    );
    await saveTrip(actor, t);
    await putRecord(actor.userId, "recovery_action", opt.id, {
      ...opt,
      appliedAt: new Date().toISOString(),
    });
    await notify(
      actor,
      "Your journey has adapted",
      opt.mode + " recovery updated " + opt.affected + " activities.",
      "TRIP_UPDATE",
      "/traveler/trips/" + t.id + "/itinerary",
    );
    return t;
  }
  if (path === "favorites") {
    const key = str(payload.id);
    if (!placeById(key) && !stayById(key)) error("Place not found.");
    const current = await first(
      "SELECT id FROM records WHERE user_id = ? AND kind = ? AND key = ?",
      actor.userId,
      "favorite",
      key,
    );
    if (current) await deleteRecord(actor.userId, "favorite", key);
    else await putRecord(actor.userId, "favorite", key, key);
    return { ok: true };
  }
  if (path === "expenses") {
    const e = expenseSchema.parse(payload);
    if (e.tripId) await getTrip(actor, e.tripId);
    const data: Expense = { ...e, id: id(), date: today() };
    await run(
      "INSERT INTO expenses (id,user_id,trip_id,data) VALUES (?,?,?,?)",
      data.id,
      actor.userId,
      e.tripId,
      JSON.stringify(data),
    );
    return data;
  }
  if (path === "expenses/delete") {
    const e = await first<{ booking_id: string | null }>(
      "SELECT booking_id FROM expenses WHERE id = ? AND user_id = ?",
      str(payload.id),
      actor.userId,
    );
    if (e?.booking_id) error("Cancel the booking to adjust this payment.");
    await run(
      "DELETE FROM expenses WHERE id = ? AND user_id = ?",
      payload.id,
      actor.userId,
    );
    return { ok: true };
  }
  if (path === "bookings/order") {
    const p = bookingSchema.parse(payload);
    if (p.date < today()) error("Choose today or a future booking date.");
    if (p.tripId) await getTrip(actor, p.tripId);
    const item =
      p.type === "Stay" ? stayById(p.itemId) : experienceById(p.itemId);
    if (!item) error("This listing is not available.");
    const rooms = p.type === "Stay" ? Math.ceil(p.guests / 2) : 0;
    const amount =
      p.type === "Stay"
        ? (item as any).price * p.nights * rooms
        : (item as any).price * p.guests;
    const configured =
      setting("RAZORPAY_KEY_ID").startsWith("rzp_test_") &&
      !!setting("RAZORPAY_KEY_SECRET");
    if (!configured && !actor.demo)
      error(
        "Payment provider is not configured. Please contact the host directly.",
      );
    const payment = configured ? "test" : "demo";
    const orderId = configured
      ? (await paymentProvider.create(amount, "YATRA-" + id().slice(0, 12))).id
      : "demo_" + id();
    const order = {
      ...p,
      title: "name" in item ? item.name : item.title,
      rooms,
      amount,
      payment,
    };
    await run(
      "INSERT INTO payment_orders (id,user_id,data,status,created_at) VALUES (?,?,?,?,?)",
      orderId,
      actor.userId,
      JSON.stringify(order),
      "pending",
      new Date().toISOString(),
    );
    return {
      id: orderId,
      amount,
      currency: "INR",
      payment,
      key: configured ? setting("RAZORPAY_KEY_ID") : null,
    };
  }
  if (path === "bookings/confirm")
    return bookingComplete(
      actor,
      str(payload.orderId),
      payload.paymentId,
      payload.signature,
    );
  if (path === "bookings/cancel") {
    const r = await first<{ data: string }>(
      "SELECT data FROM bookings WHERE id = ? AND user_id = ?",
      str(payload.id),
      actor.userId,
    );
    if (!r) error("Booking not found.");
    const booking = JSON.parse(r.data) as Booking;
    if (booking.status === "Cancelled") return { ok: true };
    if (booking.date < today())
      error("Past bookings cannot be cancelled online.");
    if (booking.payment !== "demo") {
      error(
        "For sandbox transactions, request a refund in the Razorpay test dashboard. This booking will remain confirmed until the refund is verified.",
      );
    }
    booking.status = "Cancelled";
    await binding().batch([
      binding()
        .prepare("UPDATE bookings SET data = ? WHERE id = ? AND user_id = ?")
        .bind(JSON.stringify(booking), booking.id, actor.userId),
      binding()
        .prepare("DELETE FROM expenses WHERE booking_id = ? AND user_id = ?")
        .bind(booking.id, actor.userId),
    ]);
    await notify(
      actor,
      "Demo booking cancelled",
      booking.title + " was cancelled and its demo expense removed.",
      "BOOKING",
      "/bookings",
    );
    return { ok: true };
  }
  if (path === "notifications") {
    const ns = await records<Notice>(actor.userId, "notification");
    for (const n of ns.filter((x) => payload.all || x.id === payload.id))
      await putRecord(actor.userId, "notification", n.id, { ...n, read: true });
    return { ok: true };
  }
  if (path === "routes") {
    const t = await getTrip(actor, str(payload.tripId));
    const day = z.number().int().min(1).max(t.days.length).parse(payload.day);
    const key = t.id + ":" + day;
    await putRecord(actor.userId, "route", key, {
      id: key,
      tripId: t.id,
      day,
      title: t.preferences.destination + " · Day " + day,
      favorite: false,
      createdAt: new Date().toISOString(),
    });
    return { ok: true };
  }
  if (path === "routes/update") {
    if (payload.action === "clear") {
      await run(
        "DELETE FROM records WHERE user_id = ? AND kind = ?",
        actor.userId,
        "route",
      );
      return { ok: true };
    }
    const key = str(payload.id);
    if (payload.action === "delete")
      await deleteRecord(actor.userId, "route", key);
    else {
      const list = await records<any>(actor.userId, "route");
      const r = list.find((x) => x.id === key);
      if (r)
        await putRecord(actor.userId, "route", key, {
          ...r,
          favorite: !r.favorite,
        });
    }
    return { ok: true };
  }
  if (path === "passport/award") {
    const p = placeById(str(payload.placeId));
    if (!p) error("Place not found.");
    const method = z
      .enum(["GPS arrival", "Demo arrival", "Trivia", "Audio guide"])
      .parse(payload.method);
    if (method === "Demo arrival" && !actor.demo)
      error("Demo arrival is disabled.", 403);
    if (method === "GPS arrival") {
      const lat = z.number().min(-90).max(90).parse(payload.lat),
        lng = z.number().min(-180).max(180).parse(payload.lng);
      if (distance({ lat, lng }, p) > 0.3)
        error("Move within 300 metres of the attraction to check in.");
    }
    if (method === "Trivia" && payload.answer !== p.category)
      error("Try the quiz again.");
    if (method === "Audio guide")
      error("Complete the heritage trivia to earn this stamp.");
    const key = p.id;
    const old = await first(
      "SELECT id FROM records WHERE user_id = ? AND kind = ? AND key = ?",
      actor.userId,
      "stamp",
      key,
    );
    if (!old) {
      await putRecord(actor.userId, "stamp", key, {
        id: id(),
        placeId: p.id,
        name: p.name,
        city: p.city,
        xp: method === "Trivia" ? 150 : 250,
        method,
        date: today(),
        simulated: method === "Demo arrival",
      });
      await notify(
        actor,
        "A new story in your passport",
        p.name + " stamp unlocked.",
        "PASSPORT",
        "/passport",
      );
    }
    return { ok: true };
  }
  if (path === "business/register") {
    requireRole(actor, ["business", "admin"]);
    const data = businessSchema.parse(payload);
    if (data.document && !data.document.startsWith(actor.userId + "/"))
      error("Invalid document reference.");
    const biz: Business = {
      ...data,
      id: id(),
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    await run(
      "INSERT INTO businesses (id,user_id,scope,data) VALUES (?,?,?,?)",
      biz.id,
      actor.userId,
      actor.scope,
      JSON.stringify(biz),
    );
    return biz;
  }
  if (path === "business/verify") {
    requireRole(actor, ["admin"]);
    const r = await first<{ data: string }>(
      "SELECT data FROM businesses WHERE id = ? AND scope = ?",
      str(payload.id),
      actor.scope,
    );
    if (!r) error("Business not found.");
    const status = z
      .enum(["Verified", "Rejected", "More information"])
      .parse(payload.status);
    const biz = {
      ...JSON.parse(r.data),
      status,
      note: z
        .string()
        .max(1000)
        .parse(payload.note || ""),
    };
    await run(
      "UPDATE businesses SET data = ? WHERE id = ? AND scope = ?",
      JSON.stringify(biz),
      payload.id,
      actor.scope,
    );
    return { ok: true };
  }
  if (path === "business/offer") {
    requireRole(actor, ["business"]);
    const data = offerSchema.parse(payload);
    const biz = await first<{ data: string }>(
      "SELECT data FROM businesses WHERE id = ? AND user_id = ? AND scope = ?",
      data.businessId,
      actor.userId,
      actor.scope,
    );
    if (!biz || JSON.parse(biz.data).status !== "Verified")
      error("Only a verified business can publish offers.");
    const offer: Offer = {
      ...data,
      id: payload.id ? str(payload.id) : id(),
      active: true,
      clicks: 0,
      createdAt: new Date().toISOString(),
    };
    if (payload.id) {
      const old = await first<{ data: string }>(
        "SELECT data FROM business_offers WHERE id = ? AND business_id = ?",
        payload.id,
        data.businessId,
      );
      if (!old) error("Offer not found.");
      const previous = JSON.parse(old.data);
      offer.clicks = previous.clicks;
      offer.active = previous.active;
      offer.createdAt = previous.createdAt;
    }
    await run(
      "INSERT INTO business_offers (id,business_id,scope,data) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
      offer.id,
      offer.businessId,
      actor.scope,
      JSON.stringify(offer),
    );
    return offer;
  }
  if (path === "business/offer-toggle") {
    requireRole(actor, ["business"]);
    const r = await first<{ data: string }>(
      "SELECT o.data FROM business_offers o JOIN businesses b ON b.id = o.business_id WHERE o.id = ? AND b.user_id = ? AND o.scope = ?",
      str(payload.id),
      actor.userId,
      actor.scope,
    );
    if (!r) error("Offer not found.");
    const o = JSON.parse(r.data);
    o.active = !o.active;
    await run(
      "UPDATE business_offers SET data = ? WHERE id = ?",
      JSON.stringify(o),
      payload.id,
    );
    return { ok: true };
  }
  if (path === "business/interest") {
    const offerId = str(payload.id);
    const r = await first<{ data: string }>(
      "SELECT o.data FROM business_offers o JOIN businesses b ON b.id=o.business_id WHERE o.id=? AND o.scope=? AND json_extract(b.data,'$.status')='Verified' AND json_extract(o.data,'$.active')=1",
      offerId,
      actor.scope,
    );
    if (!r) error("This offer is no longer available.");
    await binding().batch([
      binding()
        .prepare(
          "INSERT INTO records (id,user_id,kind,key,data) VALUES (?,?,?,?,?) ON CONFLICT(user_id,kind,key) DO NOTHING",
        )
        .bind(id(), actor.userId, "offer_interest", offerId, "true"),
      binding()
        .prepare(
          "UPDATE business_offers SET data=json_set(data,'$.clicks',json_extract(data,'$.clicks')+1) WHERE id=? AND changes()=1",
        )
        .bind(offerId),
    ]);
    return { ok: true };
  }
  if (path === "assistant") {
    await rateLimit(actor.userId + ":chat", 15);
    const message = str(payload.message, 2000);
    const state = await bootstrap(actor);
    const t = state.trips.find((x) => x.id === state.activeTripId);
    const msg: ChatMessage = {
      id: id(),
      role: "user",
      text: message,
      date: new Date().toISOString(),
    };
    await putRecord(actor.userId, "chat", msg.id, msg);
    let action: string | undefined;
    let text: string;
    const q = message.toLowerCase();
    const cat = getCatalog(t?.preferences.destination || state.profile.city);
    if (/rain|delay|closed|wrong/.test(q)) {
      action = t ? "/traveler/trips/" + t.id + "/live" : "/traveler/trips/new";
      text =
        "Let’s adjust the journey together. Open Fix My Trip, choose the affected stop and compare recovery options before applying a change.";
    } else if (/food|lunch|vegetarian|dinner/.test(q)) {
      action = "/explore?category=Food";
      text =
        "You can compare " +
        (cat.restaurants
          .filter((r) => r.veg)
          .map((r) => r.name)
          .slice(0, 3)
          .join(", ") || "local dining options") +
        ". Dietary suitability is from sample data. Ask the kitchen to confirm your needs.";
    } else if (/budget|cheap|hotel|cost|stay/.test(q)) {
      action = "/stays";
      const cheap = cat.stays.slice().sort((a, b) => a.price - b.price)[0];
      text = cheap
        ? `A lower-cost option is ${cheap.name} at a sample ₹${cheap.price} per room per night. Compare nights and room count in Stays. No booking or budget was changed.`
        : "Review your stay and transport allocations in Budget. No costs have been changed.";
    } else if (/passport|visa|document|ticket/.test(q)) {
      action = "/passport";
      text = "Open your Passport to view and manage your secure documents, tickets, and travel authorizations.";
    } else if (/business|partner|offer|invite/.test(q)) {
      action = "/business";
      text = "Head to the Partner Dashboard to manage your business profile, verifications, and traveler offers.";
    } else if (/profile|account|setting/.test(q)) {
      action = "/profile";
      text = "Visit your Profile to manage your personal details and accessibility preferences.";
    } else if (/experience|activity|tour/.test(q)) {
      action = "/explore?category=Experiences";
      text = "Check out local experiences, guided tours, and activities in the Explore section.";
    } else if (/booking|reservation/.test(q)) {
      action = "/bookings";
      text = "View your current reservations and past bookings here.";
    } else if (/trip|plan|itinerary/.test(q)) {
      action = "/traveler/trips";
      text = "View all your upcoming and past trips in your Trips dashboard.";
    } else if (/new|create|build/.test(q) && /trip|plan/.test(q)) {
      action = "/traveler/trips/new";
      text = "Let's build a new travel itinerary together.";
    } else if (/tool|currency|translate/.test(q)) {
      action = "/travel-toolkit";
      text = "Open the Travel Toolkit for currency conversion and language translations.";
    } else if (/audio|heritage|guide/.test(q)) {
      action = "/audio-guide";
      text = "Immerse yourself in history with our heritage audio guides.";
    } else if (/vision|scan|image|lens/.test(q)) {
      action = "/visual-lens";
      text = "Use the Visual Lens to scan and identify monuments, food, or signboards.";
    } else if (/admin|analytics|integrations/.test(q)) {
      action = "/admin";
      text = "Access the Administrator dashboard to manage the platform.";
    } else {
      action = "/explore";
      text =
        "Explore " +
        (t?.preferences.destination || state.profile.city) +
        " by interest, or ask me about your budget, vegetarian food, rain, or a delay.";
    }
    let source = demoSource(
      "Rules-based travel assistant. Gemini is not configured.",
    );
    if (setting("GEMINI_API_KEY")) {
      try {
        const resultText = await gemini(
          "Traveler question: " +
            message +
            " Context: " +
            JSON.stringify({
              trip: t,
              profile: state.profile,
              expenses: state.expenses,
              bookings: state.bookings,
            }) +
            " Provide suggestions and determine the best navigation action link to help the user. The action MUST be a relative URL matching one of the following features: /explore (can append ?category=Food or ?category=Experiences), /stays, /bookings, /passport, /traveler/trips, /business, /profile. Never say you performed an action on their behalf. Just provide the link in the action field.",
          {
            type: "object",
            properties: {
              text: { type: "string", description: "Your helpful response to the traveler." },
              action: { type: "string", description: "The relative URL to the relevant feature in the app." },
            },
            required: ["text", "action"],
          }
        );
        const result = JSON.parse(resultText);
        text = result.text;
        action = result.action;
        source = {
          provider: "Gemini",
          status: "live",
          retrievedAt: new Date().toISOString(),
        };
      } catch (e) {
        source = demoSource(
          "Gemini unavailable or failed to generate action. A rules-based response is shown.",
        );
      }
    }
    const reply: ChatMessage = {
      id: id(),
      role: "assistant",
      text,
      action,
      source,
      date: new Date().toISOString(),
    };
    await putRecord(actor.userId, "chat", reply.id, reply);
    return reply;
  }
  if (path === "vision") {
    await rateLimit(actor.userId + ":vision", 6);
    const mode = z
      .enum(["Monument", "Street Food", "Craft & Artisan", "Signboard"])
      .parse(payload.mode);
    const image = z.string().max(6000000).parse(payload.image);
    const match = image.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!match) error("Upload a JPG, PNG or WebP image.");
    if (!setting("GEMINI_API_KEY"))
      return {
        available: false,
        source: demoSource(
          "Gemini vision is not configured. Your image has not been identified.",
        ),
        description:
          "You can preview and capture images here. Add a Gemini key on the server to identify them.",
      };
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        confidence: { type: "string" },
        category: { type: "string" },
        description: { type: "string" },
        era: { type: "string" },
        price: { type: "string" },
        tip: { type: "string" },
      },
      required: [
        "name",
        "confidence",
        "category",
        "description",
        "era",
        "price",
        "tip",
      ],
    };
    const result = z
      .object({
        name: z.string().max(200),
        confidence: z.string().max(100),
        category: z.string().max(200),
        description: z.string().max(3000),
        era: z.string().max(300),
        price: z.string().max(300),
        tip: z.string().max(1000),
      })
      .parse(
        JSON.parse(
          await gemini(
            "Describe this image in mode " +
              mode +
              ". State uncertainty. Never fabricate verified prices, safe ingredients, authenticity or precise locations. If signboard, transcribe and explain the text. Confidence must be low, medium, or high and described as an AI estimate.",
            schema,
            { mimeType: match[1], data: match[2] },
          ),
        ),
      );
    await putRecord(actor.userId, "scan", id(), {
      ...result,
      date: new Date().toISOString(),
    });
    return {
      ...result,
      available: true,
      source: {
        provider: "Gemini vision",
        status: "live",
        retrievedAt: new Date().toISOString(),
      },
    };
  }
  if (path === "travel/search") {
    const origin = str(payload.origin, 100),
      destination = str(payload.destination, 100),
      date = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .parse(payload.date);
    if (date < today() || new Date(date).toISOString().slice(0, 10) !== date)
      error("Choose a valid future travel date.");
    if (origin === destination)
      error("Choose different origin and destination cities.");
    const mode = z.enum(["Flight", "Train"]).parse(payload.mode);
    return mode === "Flight"
      ? flights(
          origin,
          destination,
          date,
          z.number().int().min(1).max(9).parse(payload.travelers),
        )
      : trains(origin, destination, date);
  }
  if (path === "audio/translate") {
    await rateLimit(actor.userId + ":translate", 10);
    const p = placeById(str(payload.placeId));
    if (!p) error("Landmark not found.", 404);
    const language = z.enum(["English", "Hindi"]).parse(payload.language);
    const original = p.overview + " " + p.description;
    if (language === "English") return { story: original };
    if (!setting("GEMINI_API_KEY"))
      error(
        "Hindi translation needs a Gemini key. The original English story is available.",
      );
    const story = await gemini(
      "Translate this supplied heritage passage into Hindi. Preserve uncertainty and facts. Return only the translation. Passage: " +
        original,
    );
    return { story };
  }
  if (path === "audio/progress") {
    const key = str(payload.placeId);
    await putRecord(actor.userId, "audio", key, {
      placeId: key,
      position: z.number().min(0).max(100000).parse(payload.position),
      language: str(payload.language, 40),
    });
    return { ok: true };
  }
  error("This action does not exist.", 404);
}
export async function handle(request: Request): Promise<Response> {
  let a: Actor | undefined;
  try {
    checkOrigin(request);
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
    if (path === "auth" && request.method === "POST") {
      const data = await authenticate(request, await request.json());
      const { cookie, ...rest } = data as any;
      return Response.json(rest, {
        headers: cookie ? { "Set-Cookie": cookie } : undefined,
      });
    }
    if (path === "catalog")
      return Response.json(
        getCatalog(url.searchParams.get("city") || "Delhi"),
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    if (path === "place") {
      const p = placeById(url.searchParams.get("id") || "");
      if (!p) error("Place not found.", 404);
      return Response.json(p);
    }
    a = await actor(request);
    let data: unknown;
    if (request.method === "GET") {
      if (path === "state") {
        await initDemo(a);
        data = await bootstrap(a);
      } else if (path === "weather")
        data = await weather(url.searchParams.get("city") || "Delhi");
      else if (path === "currency") data = await currency();
      else if (path === "map") {
        const t = await getTrip(a, url.searchParams.get("tripId") || "");
        const day = t.days.find(
          (d) => d.number === Number(url.searchParams.get("day") || 1),
        );
        data = await mapRoute(day?.items || []);
      } else if (path === "config")
        data = {
          googleMapsKey: setting("GOOGLE_MAPS_BROWSER_KEY"),
          demo: a.demo,
          gemini: !!setting("GEMINI_API_KEY"),
          payment: setting("RAZORPAY_KEY_ID").startsWith("rzp_test_")
            ? "test"
            : "demo",
        };
      else if (path === "integrations") {
        requireRole(a, ["admin", "authority"]);
        data = await integrations();
      } else if (path === "analytics") {
        requireRole(a, ["admin", "authority", "business"]);
        const state = await bootstrap(a);
        const trips = a.demo
          ? state.trips
          : (
              await rows<{ data: string }>(
                "SELECT data FROM trips WHERE user_id NOT LIKE 'demo:%' ORDER BY created_at DESC LIMIT 1000",
              )
            ).map(parseData<Trip>);
        const items = a.demo
          ? state.trips.flatMap((t) => t.days.flatMap((d) => d.items))
          : (
              await rows<{ data: string }>(
                "SELECT i.data FROM itinerary_items i JOIN trip_days d ON d.id=i.day_id JOIN trips t ON t.id=d.trip_id WHERE t.user_id NOT LIKE 'demo:%' LIMIT 10000",
              )
            ).map(parseData<import("../lib/types").Item>);
        const counts = allPlaces
          .map((p) => ({
            name: p.name.split(" (")[0],
            value: items.filter((i) => i.placeId === p.id).length,
            hidden: p.hidden,
          }))
          .filter((x) => x.value > 0);
        data = {
          travelers: a.demo
            ? 1
            : (
                await first<{ n: number }>(
                  "SELECT COUNT(*) AS n FROM users WHERE id NOT LIKE ?",
                  "demo:%",
                )
              )?.n || 0,
          trips: trips.length,
          partners: state.businesses.filter((b) => b.status === "Verified")
            .length,
          hiddenShare: items.length
            ? Math.round(
                (items.filter((i) => placeById(i.placeId)?.hidden).length /
                  items.length) *
                  100,
              )
            : 0,
          distribution: counts,
          source: a.demo ? "Demo workspace records" : "Stored platform records",
          demand: state.offers.reduce((n, o) => n + o.clicks, 0),
        };
      } else if (path === "audio/progress")
        data =
          (await records(a.userId, "audio")).find(
            (x: any) => x.placeId === url.searchParams.get("placeId"),
          ) || null;
      else if (path === "uploads/document") {
        requireRole(a, ["business", "admin"]);
        const key = url.searchParams.get("key") || "";
        if (!key.startsWith(a.userId + "/")) {
          if (a.role !== "admin") error("Access denied", 403);
          const permitted = await rows<{ data: string }>(
            "SELECT data FROM businesses WHERE scope = ?",
            a.scope,
          );
          if (!permitted.some((x) => JSON.parse(x.data).document === key))
            error("Access denied", 403);
        }
        const file = await (env as any).BUCKET?.get(key);
        if (!file) error("Document not found", 404);
        return new Response(file.body, {
          headers: {
            "Content-Type":
              file.httpMetadata?.contentType || "application/octet-stream",
            "Content-Disposition":
              'attachment; filename="verification-document"',
          },
        });
      } else error("Page not found.", 404);
    } else if (request.method === "POST") {
      if (path === "uploads") {
        requireRole(a, ["business"]);
        const form = await request.formData();
        const file = form.get("file");
        if (
          !(file instanceof File) ||
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
        )
          error("Choose a PDF, PNG or JPG up to 5 MB.");
        const key = a.userId + "/" + id();
        if (!(env as any).BUCKET)
          error("Document storage is unavailable.", 503);
        await (env as any).BUCKET.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type },
        });
        data = { key };
      } else {
        if (Number(request.headers.get("content-length") || 0) > 6500000)
          error("Request is too large.", 413);
        data = await post(path, request, a, await request.json());
      }
    } else error("Method not allowed", 405);
    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
        ...(a.cookie ? { "Set-Cookie": a.cookie } : {}),
      },
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    const message =
      e instanceof z.ZodError
        ? e.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .slice(0, 3)
            .join("; ")
        : err.message;
    return Response.json(
      { error: message || "Something went wrong. Please try again." },
      {
        status: err.status || (e instanceof z.ZodError ? 400 : 400),
        headers: { ...(a?.cookie ? { "Set-Cookie": a.cookie } : {}) },
      },
    );
  }
}
