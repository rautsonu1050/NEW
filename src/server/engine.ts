/**
 * Travel Engine
 *
 * Contains complex logic for itinerary generation, scheduling,
 * budgeting, and automated trip recovery algorithms.
 */
import type {
  Preferences,
  Trip,
  TripDay,
  Item,
  Place,
  Incident,
  Recovery,
  Provenance,
} from "../lib/types";
import { getCatalog, placeById, scorePlace } from "./catalog";
import { addDays, id, distance, clock, minutes } from "../lib/utils";
import { cityFor } from "../data/cities";
export const demoSource = (
  message = "Local sample catalog. Prices, opening hours and availability need confirmation.",
): Provenance => ({
  provider: "YATRA catalog",
  status: "demo",
  retrievedAt: null,
  message,
});
const closures: Record<string, number[]> = {
  plc_red_fort: [1],
  plc_national_museum: [1],
  plc_lotus_temple: [1],
  plc_taj_mahal: [5],
};
function hours(place: Place) {
  const m = place.hours.match(
    /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i,
  );
  if (!m) return [540, 1080];
  const n = (hotel: string, v: string, ap: string) =>
    ((Number(hotel) % 12) + (ap.toUpperCase() === "PM" ? 12 : 0)) * 60 +
    Number(v || 0);
  return [n(m[1], m[2], m[3]), n(m[4], m[5], m[6])];
}
export function isOpen(place: Place, date: string) {
  return !(closures[place.id] || []).includes(
    new Date(date + "T12:00:00Z").getUTCDay(),
  );
}
export function itemFor(place: Place, prefs: Preferences): Item {
  return {
    id: id(),
    placeId: place.id,
    title: place.name,
    time: "09:00",
    duration: place.duration,
    cost: place.cost * prefs.travelers,
    category: place.category,
    lat: place.lat,
    lng: place.lng,
    image: place.image,
    indoor: place.indoor,
    reason: `Fits ${place.interests.filter((x) => prefs.interests.includes(x)).join(", ") || "your destination"}${place.hidden ? " and introduces a quieter local stop" : ""}. Entry fees are sample estimates for your group.`,
    travelMinutes: 0,
    distance: 0,
  };
}
/** Schedules a list of activities for a given day, taking travel times and opening hours into account. */
export function schedule(
  items: Item[],
  prefs: Preferences,
  date: string,
  start = 540,
  keepTimes = false,
): Item[] {
  let cursor = start;
  let prev: Item | undefined;
  const output: Item[] = [];
  const speed =
    prefs.transport === "Walking" ? 4 : prefs.transport === "Cab" ? 22 : 18;
  const buffer = prefs.accessibility.length ? 20 : 12;
  for (const input of items) {
    const item = { ...input };
    const place = placeById(item.placeId);
    if (place && !isOpen(place, date)) continue;
    const km = prev ? distance(prev, item) : 0;
    item.distance = km;
    item.travelMinutes = prev
      ? Math.max(5, Math.ceil((km / speed) * 60) + buffer)
      : 0;
    const [open, close] = place ? hours(place) : [480, 1320];
    const at = Math.max(
      cursor + item.travelMinutes,
      open,
      keepTimes ? minutes(item.time) : 0,
    );
    if (at + item.duration > close || at + item.duration > 1320) continue;
    item.time = clock(at);
    output.push(item);
    cursor = at + item.duration;
    prev = item;
  }
  return output;
}
/** Recalculates the budget estimates and breakdowns for a trip. */
export function budget(trip: Trip) {
  const actual = trip.days.flatMap((tripDay) => tripDay.items);
  trip.breakdown.Attractions = actual
    .filter((x) => x.category !== "Food" && x.category !== "Free time")
    .reduce((n, x) => n + x.cost, 0);
  trip.breakdown.Food =
    actual
      .filter((x) => x.category === "Food")
      .reduce((n, x) => n + x.cost, 0) +
    trip.days.length * trip.preferences.travelers * 350;
  trip.estimate = Object.values(trip.breakdown).reduce((a, b) => a + b, 0);
  return trip;
}
/** Generates a complete multi-day travel itinerary based on user preferences and recommended plans. */
export function buildTrip(
  prefs: Preferences,
  plan?: {
    title: string;
    days: { day: number; placeIds: string[]; reason: string }[];
    notes: string[];
  },
  source = demoSource(),
): Trip {
  const catalog = getCatalog(prefs.destination);
  if (!catalog.places.length)
    throw new Error(
      "This destination has no local catalog yet. Choose one of the 11 supported destinations for a reliable sample itinerary.",
    );
  const count =
    Math.round(
      (Date.parse(prefs.endDate) - Date.parse(prefs.startDate)) / 86400000,
    ) + 1;
  const seen = new Set<string>();
  const days: TripDay[] = [];
  const perDay = prefs.accessibility.some((x) =>
    /walking|Wheelchair|Senior/.test(x),
  )
    ? 2
    : 4;
  for (let i = 0; i < count; i++) {
    const date = addDays(prefs.startDate, i);
    const recommended = plan?.days.find(
      (tripDay) => tripDay.day === i + 1,
    )?.placeIds;
    let pool = catalog.places.filter((x) => !seen.has(x.id) && isOpen(x, date));
    pool.sort((a, b) => scorePlace(b, prefs) - scorePlace(a, prefs));
    if (recommended)
      pool.sort((a, b) => {
        const ia = recommended.indexOf(a.id),
          ib = recommended.indexOf(b.id);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
    const selected = pool.slice(0, perDay);
    const items = selected.map((x) => itemFor(x, prefs));
    const dining = catalog.restaurants
      .filter((restaurant) =>
        prefs.food === "Vegan"
          ? false
          : prefs.food === "Jain"
            ? restaurant.jain
            : prefs.food === "Pure Vegetarian"
              ? restaurant.pureVeg
              : prefs.food === "Vegetarian"
                ? restaurant.veg
                : true,
      )
      .sort((a, b) => a.price - b.price);
    const mealCap = (prefs.budget * 0.22) / count / prefs.travelers;
    const affordable = dining.filter(
      (restaurant) => restaurant.price <= mealCap,
    );
    const restaurant =
      affordable[i % Math.max(1, affordable.length)] || dining[0];
    const near = selected[0] || catalog.places[0];
    const meal: Item = {
      id: id(),
      placeId: restaurant?.id || "meal",
      title:
        restaurant?.name ||
        `${prefs.food === "No Preference" ? "Local" : prefs.food} lunch break`,
      time: "13:00",
      duration: 60,
      cost: (restaurant?.price || 300) * prefs.travelers,
      category: "Food",
      lat: near.lat,
      lng: near.lng,
      image: restaurant?.image || "",
      indoor: true,
      reason: restaurant
        ? `Sample ${restaurant.cuisine} dining suggestion. Map position is approximate. Confirm dietary preparation with the kitchen.`
        : "Choose a suitable restaurant locally. Meal location is approximate and dietary requirements are unverified.",
      travelMinutes: 10,
      distance: 0,
    };
    items.splice(Math.min(2, items.length), 0, meal);
    if (!selected.length)
      items.push({
        id: id(),
        placeId: "free-time",
        title: "Unhurried local exploration",
        time: "15:00",
        duration: 120,
        cost: 0,
        category: "Free time",
        lat: near.lat,
        lng: near.lng,
        image: near.image,
        indoor: false,
        reason:
          "The local catalog has no more unique attractions. Keep this flexible time for your own discoveries.",
        travelMinutes: 0,
        distance: 0,
      });
    const scheduled = schedule(items, prefs, date);
    scheduled
      .filter((x) => placeById(x.placeId))
      .forEach((x) => seen.add(x.placeId));
    days.push({
      number: i + 1,
      date,
      title:
        i === 0
          ? "First impressions"
          : i === 1
            ? "A little deeper"
            : selected.some((x) => x.hidden)
              ? "The quieter side"
              : "At your own pace",
      items: scheduled,
    });
  }
  const rooms = Math.ceil(prefs.travelers / 2);
  const nightlyCap = (prefs.budget * 0.35) / Math.max(1, count - 1) / rooms;
  const stays = catalog.stays.filter(
    (hotel) =>
      (!prefs.accessibility.includes("Elevator/lift priority") || hotel.lift) &&
      (!prefs.accessibility.includes("Senior-friendly") || hotel.senior),
  );
  const preferred: Record<string, RegExp> = {
    "Boutique / Heritage": /Heritage|Haveli/i,
    "Luxury 5-Star": /Luxury/i,
    "Comfort 3/4-Star": /Hotel|Resort/i,
    "Hostel / Social": /Hostel/i,
    "Local Homestay": /Homestay/i,
  };
  const fit = (type: string) => (preferred[prefs.stay]?.test(type) ? 5 : 0);
  const stay =
    stays
      .filter((hotel) => hotel.price <= nightlyCap)
      .sort((a, b) => fit(b.type) + b.rating - (fit(a.type) + a.rating))[0] ||
    stays.sort((a, b) => a.price - b.price)[0];
  const nightly = stay?.price || Math.max(500, Math.round(nightlyCap));
  const origin = cityFor(prefs.origin),
    dest = cityFor(prefs.destination);
  const intercity =
    origin && dest && origin.name !== dest.name
      ? Math.max(1000, Math.round(distance(origin, dest) * 3)) * prefs.travelers
      : 0;
  const trip: Trip = {
    id: id(),
    title: plan?.title || `${prefs.destination}, your way`,
    preferences: prefs,
    days,
    estimate: 0,
    emergency: Math.round(prefs.budget * 0.12),
    buffer: Math.round(prefs.budget * 0.08),
    breakdown: {
      Stay: nightly * Math.max(0, count - 1) * rooms,
      Food: 0,
      Transport:
        count * prefs.travelers * (prefs.transport === "Cab" ? 700 : 200) +
        intercity,
      Attractions: 0,
    },
    source,
    notes: [
      `Accommodation: ${stay?.name || "Local stay estimate"}, ${rooms} room(s), ${Math.max(0, count - 1)} night(s). No reservation has been made.`,
      "Travel durations use distance estimates. Opening hours and closures come from sample catalog data, not a live verification.",
      "Local prices and dietary suitability are estimates. Confirm with venues before you travel.",
      ...(prefs.accessibility.length
        ? [
            "Accessibility requests reduce daily stops and add travel buffers. Venue access is unverified, so confirm step-free entry, lifts and assistance before booking.",
          ]
        : []),
      ...(plan?.notes || []),
    ],
    createdAt: new Date().toISOString(),
    version: 1,
    recoveryIds: [],
  };
  budget(trip);
  if (trip.estimate + trip.emergency + trip.buffer > prefs.budget)
    trip.notes.unshift(
      "This plan exceeds the spendable budget after reserves. Reduce nights, choose a cheaper stay, or increase the budget before booking.",
    );
  return trip;
}
export { health } from "../lib/health";
import { health } from "../lib/health";
export const incidentTypes = [
  "Heavy rain",
  "Attraction closed",
  "Train delayed",
  "Flight delayed",
  "Traffic congestion",
  "Running late",
  "Transport unavailable",
  "Hotel cancellation",
  "Budget overrun",
  "Medical requirement",
  "Route blocked",
  "Crowd surge",
];
/** Generates recovery options when an incident occurs during a live trip, adapting the schedule automatically. */
export function recover(trip: Trip, incident: Incident): Recovery[] {
  const target = trip.days.find((tripDay) => tripDay.number === incident.day);
  if (!target) throw new Error("Choose a valid trip day.");
  let at = target.items.findIndex((x) => x.id === incident.itemId);
  if (at < 0) at = 0;
  const sourceItem = target.items[at];
  if (!sourceItem) throw new Error("Add an activity to this day first.");
  const options = ["Fastest", "Cheapest", "Balanced"];
  return options.map((mode, index) => {
    const days = structuredClone(trip.days);
    const d = days.find((x) => x.number === incident.day)!;
    const blocked = [
      "Heavy rain",
      "Attraction closed",
      "Route blocked",
      "Crowd surge",
    ].includes(incident.type);
    const used = new Set(
      days.flatMap((day) => day.items.map((i) => i.placeId)),
    );
    let alternatives = getCatalog(trip.preferences.destination).places.filter(
      (place) =>
        !used.has(place.id) &&
        isOpen(place, d.date) &&
        (incident.type !== "Heavy rain" || place.indoor),
    );
    alternatives.sort((a, b) =>
      index === 1
        ? a.cost - b.cost
        : distance(a, sourceItem) - distance(b, sourceItem),
    );
    const changes: { before: string; after: string }[] = [];
    const warnings: string[] = [];
    let next = [...d.items];
    if (blocked) {
      const replacement = alternatives[0];
      if (replacement) {
        const item = {
          ...itemFor(replacement, trip.preferences),
          id: sourceItem.id,
          replaced: true,
          originalTitle: sourceItem.title,
          reason: `${mode} recovery for ${incident.type.toLowerCase()}. ${replacement.indoor ? "Indoor alternative." : ""} Travel and entry costs are estimates.`,
        };
        next[at] = item;
        changes.push({ before: sourceItem.title, after: item.title });
      } else {
        next.splice(at, 1);
        changes.push({
          before: sourceItem.title,
          after: "Removed from today’s plan",
        });
        warnings.push(
          "No suitable unused alternative is available in the catalog. Confirm safe local options before continuing.",
        );
      }
    }
    if (incident.type === "Medical requirement") {
      warnings.push(
        "Pause sightseeing and contact emergency services or a local clinician. This tool cannot assess medical urgency.",
      );
      next = next.slice(0, at);
      changes.push({
        before: sourceItem.title,
        after: "Sightseeing paused for medical assistance",
      });
    }
    if (incident.type === "Hotel cancellation")
      warnings.push(
        "No accommodation was automatically rebooked. Use Stays to check a replacement with the host.",
      );
    const shift =
      index === 0
        ? Math.max(0, incident.delay - 45)
        : index === 1
          ? incident.delay
          : Math.max(0, incident.delay - 20);
    const fixed = next.slice(0, at);
    const tail = next.slice(at);
    const begin = Math.max(
      minutes(sourceItem.time) + shift,
      fixed.length
        ? minutes(fixed[fixed.length - 1].time) +
            fixed[fixed.length - 1].duration +
            15
        : 540,
    );
    const scheduled = schedule(tail, trip.preferences, d.date, begin);
    const lost = tail.filter((x) => !scheduled.some((y) => y.id === x.id));
    lost.forEach((x) =>
      changes.push({
        before: x.title,
        after: "Removed because it no longer fits opening hours",
      }),
    );
    d.items = [...fixed, ...scheduled];
    let surcharge =
      index === 0
        ? Math.round(150 * trip.preferences.travelers)
        : index === 1
          ? 0
          : Math.round(60 * trip.preferences.travelers);
    if (incident.type === "Medical requirement") surcharge = 0;
    if (incident.type === "Budget overrun") {
      surcharge = 0;
      d.items = d.items.filter((x) => x.cost === 0 || x.category === "Food");
      target.items
        .filter((x) => !d.items.some((y) => y.id === x.id))
        .forEach((x) =>
          changes.push({
            before: x.title,
            after: "Removed paid activity to reduce costs",
          }),
        );
    }
    const originalCost = target.items.reduce((s, x) => s + x.cost, 0);
    const newCost = d.items.reduce((s, x) => s + x.cost, 0);
    const delta = newCost - originalCost + surcharge;
    const last = (items: Item[]) =>
      items.length
        ? minutes(items[items.length - 1].time) +
          items[items.length - 1].duration
        : 0;
    const afterTrip = { ...trip, days, estimate: trip.estimate + delta };
    return {
      id: id(),
      tripId: trip.id,
      baseVersion: trip.version,
      mode,
      title:
        index === 0
          ? "Get back on schedule"
          : index === 1
            ? "Keep extra costs low"
            : "Make room to breathe",
      description:
        index === 0
          ? "Use a faster transfer and the nearest suitable alternative."
          : index === 1
            ? "Use public transport and allow more time between stops."
            : "Balance the number of changes, travel time and cost.",
      costDelta: delta,
      timeDelta: last(d.items) - last(target.items),
      before: health(trip, incident).overall,
      after: health(afterTrip).overall,
      replacements: changes,
      days,
      affected: Math.max(
        changes.length,
        d.items.filter((x, i) => x.time !== target.items[i]?.time).length,
      ),
      warnings: [
        ...warnings,
        "Recovery estimates do not change transport tickets, restaurant reservations or hotel bookings. Confirm any affected bookings separately.",
      ],
      incident,
    };
  });
}
