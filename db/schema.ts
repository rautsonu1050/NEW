import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  role: text("role").notNull().default("traveler"),
  profile: text("profile").notNull(),
  activeTripId: text("active_trip_id"),
  onboarding: integer("onboarding").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  demo: integer("demo").notNull(),
  expires: integer("expires").notNull(),
});
export const trips = sqliteTable(
  "trips",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    data: text("data").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_trips_user").on(t.userId)],
);
export const tripDays = sqliteTable(
  "trip_days",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    date: text("date").notNull(),
    title: text("title").notNull(),
  },
  (t) => [uniqueIndex("idx_trip_days_trip_number").on(t.tripId, t.number)],
);
export const itineraryItems = sqliteTable(
  "itinerary_items",
  {
    id: text("id").primaryKey(),
    dayId: text("day_id")
      .notNull()
      .references(() => tripDays.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    data: text("data").notNull(),
  },
  (t) => [index("idx_itinerary_day").on(t.dayId, t.position)],
);
export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: text("trip_id").references(() => trips.id, {
      onDelete: "set null",
    }),
    orderId: text("order_id").unique(),
    data: text("data").notNull(),
  },
  (t) => [index("idx_bookings_user").on(t.userId)],
);
export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: text("trip_id").references(() => trips.id, {
      onDelete: "set null",
    }),
    bookingId: text("booking_id")
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    data: text("data").notNull(),
  },
  (t) => [index("idx_expenses_user_trip").on(t.userId, t.tripId)],
);
export const businesses = sqliteTable(
  "businesses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    data: text("data").notNull(),
  },
  (t) => [index("idx_business_scope").on(t.scope)],
);
export const businessOffers = sqliteTable(
  "business_offers",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    data: text("data").notNull(),
  },
  (t) => [index("idx_offer_scope").on(t.scope)],
);
export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    data: text("data").notNull(),
  },
  (t) => [
    uniqueIndex("idx_records_owner_kind_key").on(t.userId, t.kind, t.key),
  ],
);
export const paymentOrders = sqliteTable("payment_orders", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});
export const serviceCache = sqliteTable("service_cache", {
  key: text("key").primaryKey(),
  data: text("data").notNull(),
  expires: integer("expires").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
