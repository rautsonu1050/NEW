# YATRA AI

A responsive India travel companion continued from the supplied YATRA project. The existing React, TypeScript, Vinext, D1 and R2 architecture is preserved.

## Comprehensive Documentation

For a deep dive into the project's strategy, architecture, and ongoing development, please refer to the following extensive documentation files:

- 📖 **[Product Requirements (PRD.md)](./PRD.md)** - Features, target audience, and product scope.
- 🏗️ **[System Architecture (ARCHITECTURE.md)](./ARCHITECTURE.md)** - Edge computing, database models, and Gemini AI integration.
- 🎨 **[UI/UX Design (DESIGN.md)](./DESIGN.md)** - Premium styling, color philosophy, and interactive elements.
- 📜 **[Development Rules (RULES.md)](./RULES.md)** - Coding conventions, Zod validation, and TypeScript guidelines.
- 🧠 **[Agent Memory (MEMORY.md)](./MEMORY.md)** - Historical context, "gotchas", and AI developer instructions.
- 🚀 **[Task Backlog (TASKS.md)](./TASKS.md)** - Ongoing roadmap and technical debt tracking.

## Run the app on your computer

1. Install Node.js 22.13 or newer (Node 24 LTS is suitable).
2. Extract the source ZIP, then open its folder in VS Code.
3. Open a terminal **inside the folder containing `package.json`**.
4. Run:

```sh
npm install
npm run dev
```

Open the address printed by Vite in your **web browser**. Do not type that address as a PowerShell command. You do not need Android Studio to run this web app.

The `predev` script applies the included migrations to a local SQLite database automatically. Your local trips, bookings, expenses and business changes survive refreshes and server restarts. Local data lives under `.wrangler/state`; keep that folder to preserve it. No API key is required for the demo.

On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev`, or use the Command Prompt terminal. The development command is cross-platform. The supplied production build scripts target Linux; use WSL on Windows for production builds.

## Start exploring

Use the menu beside the profile avatar to select a demo role. Each demo workspace is isolated from other users.

- **Traveler:** plan a trip, open My Trips, edit an itinerary, try a recovery scenario, book a sample stay, record expenses and explore the travel tools.
- **Business:** select an existing verified sample business, create or edit an offer, pause it, or register another business for review.
- **Admin:** review partner applications, approve, reject or request more information, inspect stored travel analytics and provider configuration.
- **Tourism Authority:** view analytics and integration status. This role cannot approve businesses.

New demo workspaces receive a sample Delhi trip and clearly identified sample businesses. The sample prices, venue hours, accessibility information and inventory are not live provider facts.

## Completed workflows

| Area         | Behavior                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trip planner | Nine-step preference form; 11 destinations; validated dates and group size; deterministic fallback; optional structured Gemini plans                                           |
| Itinerary    | Add, remove, replace, complete, change time and optimize a day; opening-hour checks; saved edits; version conflicts rejected                                                   |
| Recovery     | Twelve incident types; fastest, cheapest and balanced previews; explicit approval before application; changes only affect the selected day; cost delta and applied total agree |
| Bookings     | Stay and experience checkout; server-calculated prices; room count; demo payment; optional Razorpay test payment verification; persistent booking references and QR passes     |
| Cancellation | Demo cancellation removes the associated expense; repeated cancellation and confirmation are idempotent                                                                        |
| Budget       | Saved manual expenses, booking-linked expenses, category totals, reserves and remaining budget                                                                                 |
| Discovery    | City, category, dietary and stay filters; favorites; place details; local partner offers                                                                                       |
| Map          | Leaflet/OpenStreetMap fallback; optional Google Maps and Routes; saved routes; approximate connections clearly identified                                                      |
| Tools        | Auto-fare illustration, address parser, Hindi phrasebook, currency conversion, cost estimator, street guide, demo flight and rail search                                       |
| Heritage     | Browser audio narration, saved progress, transcript, trivia and heritage stamps; optional Hindi translation and image recognition through Gemini                               |
| Business     | Registration, private document upload, verification status and notes, offers, edit/pause/reactivate and recorded traveler interest                                             |
| Admin        | Role-restricted partner review, stored itinerary analytics, hidden-gem share and honest integration status                                                                     |
| Account      | Saved travel preferences, onboarding, in-app notifications, emergency contact, offline itinerary text; optional Supabase email/Google authentication                           |

## Configure optional providers

Copy `.env.example` to `.env` and add only the keys you intend to use. Restart the server after changing environment values. Alternatively use `.dev.vars`, supported by the Cloudflare runtime. Never commit either file. Hosted environment variables are configured separately through the hosting environment.

| Environment variable                         | Purpose                                                                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEMO_MODE`                                  | Defaults to `true`. Set `false` only after real authentication and server-side roles are configured.                                                        |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`          | Supabase Auth project endpoint and publishable/anon key. Email/password, confirmation, recovery and Google PKCE are supported.                              |
| `GEMINI_API_KEY`, `GEMINI_MODEL`             | Server-side trip generation, assistant, image understanding and Hindi translation. Choose a model available to your account.                                |
| `GOOGLE_MAPS_BROWSER_KEY`                    | Maps JavaScript browser key. Restrict it to your site origins and the required browser API. This is intentionally public in the map configuration response. |
| `GOOGLE_ROUTES_API_KEY`                      | Server-side route requests. Keep it secret.                                                                                                                 |
| `GOOGLE_PLACES_API_KEY`                      | Reserved configuration entry. Discovery currently uses the imported local catalog.                                                                          |
| `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` | Amadeus test flight-offer search. Test inventory is labeled as sandbox data.                                                                                |
| `RAIL_PROVIDER_URL`, `RAIL_PROVIDER_KEY`     | Optional licensed rail-provider adapter described below.                                                                                                    |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`     | **Test keys only.** The public key must start with `rzp_test_`. Server verifies HMAC, payment/order association, captured status, amount and currency.      |

Weather uses Open-Meteo and currency conversion uses ExchangeRate-API without application keys. Successful responses are cached. When unavailable, the UI labels fallback values as demo data. Map tiles also require internet access.

For Google login, enable the Google provider in Supabase and allow your exact `/auth-return` URL in Supabase's redirect configuration. Add your local development origin and deployed origin as appropriate. Account roles are loaded from the server's `users` table. Assign business/admin/authority roles using a trusted database administration workflow. The public app cannot promote a production user by changing a client-side value.

The optional rail adapter receives GET parameters `origin`, `destination` and `date` plus an Authorization bearer header. It must return:

```json
{
  "trains": [
    {
      "name": "Provider train name",
      "origin": "Mumbai",
      "destination": "Delhi",
      "departure": "2026-10-01T18:30:00+05:30",
      "duration": "12h 30m",
      "price": 1450
    }
  ]
}
```

## Service boundaries

Demo bookings do not reserve a real room, buy a transport ticket or issue an attraction admission ticket. No live money is charged by the default app. Razorpay sandbox refunds currently require action in the Razorpay test dashboard; the app does not claim a refund completed without verification. There is no production supplier-reservation or ticket-issuance adapter in this project.

Venue hours, prices, sample ratings and accessibility claims were imported from the provided project or added as clearly marked sample catalog entries. Many listing photographs show the destination rather than the individual property. Confirm essential arrangements with venues. The trip-health score is an illustrative planning score, not a medical or safety assessment. Map fallback lines are not road navigation. Sensor-dependent features need browser support and permission.

The local deterministic itinerary engine works without AI. Gemini, Supabase, paid mapping, rail-provider and Razorpay integrations require valid credentials and provider-side configuration. Their live end-to-end operation cannot be verified without those credentials.

## Project layout

```text
app/                 App Router pages, API route and shared stylesheet
src/features/        Traveler, booking, tools, heritage, business, admin and account screens
src/components/      Shared YATRA controls and navigation
src/server/          Authentication, D1 persistence, API actions, trip/recovery engine and providers
src/data/            Imported catalog and destination definitions
src/lib/             Types, validation, browser helpers and formatting
components/ui/       Retained shadcn primitives
worker/              Cloudflare Worker entry
public/              Local photographs and vendored map/QR libraries
db/                  Drizzle schema
drizzle/             Generated migrations
scripts/             Existing build helpers and automatic local database setup
tests/               Engine, API, database behavior, UI primitive and build-artifact checks
```

Persistence uses 13 relational D1/SQLite tables. Itinerary days and items are stored separately from trip metadata. Booking and expense writes are batched, and trip edits use version-checked atomic batches. Business documents use private R2 storage. Server code validates roles, ownership and write origins.

## Check changes

```sh
npm run typecheck
node --test tests/yatra.test.mjs
```

For the complete suite on Linux/WSL:

```sh
npm test
```

`npm test` runs the retained production build and all tests. The domain tests use an in-memory SQLite adapter with the actual schema and API controller. They do not contact external payment or identity providers. Browser QA covers the running local app separately. See `docs/VALIDATION.md` for the checked workflows and remaining provider limitations.

To create a future schema migration, update `db/schema.ts` and run `npm run db:generate` on Linux/WSL. Commit the generated SQL and migration metadata. `npm run db:local` applies pending local migrations. Hosted deployments apply the packaged migrations.

Image sources and licensing notes are in `IMAGE-CREDITS.md` and `public/images/credits.json`.
