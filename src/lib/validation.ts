import { z } from "zod";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (x) =>
      !Number.isNaN(Date.parse(x)) &&
      new Date(x).toISOString().slice(0, 10) === x,
    "Enter a valid date",
  );
export const preferencesSchema = z
  .object({
    origin: z.string().trim().min(2).max(100),
    destination: z.string().trim().min(2).max(100),
    startDate: date,
    endDate: date,
    travelers: z.number().int().min(1).max(20),
    group: z.string().max(30),
    budget: z.number().int().positive().max(10000000),
    interests: z.array(z.string().max(40)).min(1).max(20),
    food: z.string().max(50),
    transport: z.string().max(50),
    stay: z.string().max(50),
    accessibility: z.array(z.string().max(80)).max(10),
    request: z.string().max(2000),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })
  .refine(
    (v) => (Date.parse(v.endDate) - Date.parse(v.startDate)) / 86400000 < 14,
    { message: "Plan up to 14 days at a time", path: ["endDate"] },
  )
  .refine((v) => v.startDate >= new Date().toISOString().slice(0, 10), {
    message: "Choose today or a future date",
    path: ["startDate"],
  });
export const expenseSchema = z.object({
  tripId: z.string().nullable(),
  title: z.string().trim().min(2).max(100),
  amount: z.number().positive().max(1000000),
  category: z.enum([
    "Stay",
    "Food",
    "Transport",
    "Attractions",
    "Activities",
    "Shopping",
    "Miscellaneous",
  ]),
  method: z.enum(["UPI", "GPay", "Cash", "Card"]),
  notes: z.string().max(1000).default(""),
});
export const bookingSchema = z.object({
  itemId: z.string(),
  tripId: z.string().nullable(),
  date,
  nights: z.number().int().min(1).max(30),
  guests: z.number().int().min(1).max(20),
  type: z.enum(["Stay", "Experience"]),
  guest: z.string().trim().min(2).max(100),
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  phone: z
    .string()
    .regex(/^[+\d ()-]{7,20}$/)
    .or(z.literal("")),
  city: z.string().max(100),
  language: z.string().max(40),
  food: z.string().max(50),
  transport: z.string().max(50),
  pace: z.string().max(40),
  interests: z.array(z.string().max(40)).max(20),
  accessibility: z.array(z.string().max(80)).max(10),
  emergencyContact: z.string().max(150),
  notifications: z.boolean(),
});
export const businessSchema = z.object({
  name: z.string().trim().min(3).max(100),
  owner: z.string().trim().min(2).max(100),
  category: z.string().min(2).max(80),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(80),
  phone: z.string().regex(/^[+\d ()-]{7,20}$/),
  document: z.string().optional(),
});
export const offerSchema = z.object({
  businessId: z.string(),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(5).max(1000),
  discount: z.number().int().min(1).max(90),
  price: z.number().int().min(1).max(100000),
  food: z.string().min(2).max(100),
  location: z.string().min(3).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timeWindow: z.string().min(3).max(100),
  target: z.string().min(3).max(100),
  image: z.string().optional(),
});
export const aiPlanSchema = z.object({
  title: z.string().min(3).max(150),
  days: z
    .array(
      z.object({
        day: z.number().int().min(1).max(14),
        placeIds: z.array(z.string()).max(6),
        reason: z.string().max(500),
      }),
    )
    .min(1)
    .max(14),
  notes: z.array(z.string().max(500)).max(10),
});
export const aiPlanJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "integer" },
          placeIds: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
        required: ["day", "placeIds", "reason"],
      },
    },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["title", "days", "notes"],
};
