# YATRA validation

Validated in the continued project on 7 September 2026. Existing work was preserved.

## Automated checks

TypeScript compilation passes. The production Worker and client build pass. All 14 automated tests pass using `node --test --test-concurrency=1 tests/*.test.mjs` after the build.

The suite checks:

- All 11 destinations produce dated schedules, unique catalog attractions, non-overlapping times and matching cost totals.
- Invalid dates, reversed date ranges, empty interests, oversized groups and invalid budgets are rejected.
- Vegan plans do not label unverified restaurant preparation as verified vegan food.
- All 12 recovery scenarios offer three alternatives and preserve unrelated trip days.
- Stale itinerary writers cannot delete or overwrite current days; actual add, remove and replace actions persist.
- Invalid time edits are rejected. Applied recovery totals match the preview and the same option cannot be applied twice.
- Prices are calculated server-side, including multiple rooms; duplicate booking confirmation cannot create duplicate expenses; demo cancellation removes its linked expense.
- Other users cannot cancel someone else's booking; traveler roles cannot verify businesses; unverified businesses cannot publish offers.
- Admin review, business offers, editing, pause/reactivation and unique interest counts persist. Editing does not reactivate a paused offer.
- Flight/rail/weather/currency fallbacks are explicitly marked demo; audio progress persists; duplicate heritage stamps do not multiply XP.
- Production mode rejects anonymous demo entry and cross-origin writes are rejected.
- UI primitive accessibility semantics, responsive CSS, build assets, D1/R2 bindings and all required migrations are present.

The domain suite executes the actual API controller and repository using an in-memory SQLite adapter with the actual generated schema. It does not substitute hardcoded API responses.

## Browser workflows

Checked on the running app:

- Home page, saved trip navigation, itinerary completion, remove/add, replacement validation, recovery comparison and application.
- Stay filtering, room-count checkout math (3 guests, 2 rooms, 2 nights), demo confirmation, persisted booking QR reference, pass view and cancellation controls.
- Auto-fare recalculation, night supplement, address interpretation, phrasebook filtering, flight search with labeled demo results, currency amount changes and currency swapping.
- Role-restricted admin page, demo role switch, partner application table, approval dialog and saved review note.
- Business dashboard, offer creation, saved offer, and pause action.
- Desktop layout and dedicated phone/tablet viewport inspection.

## Boundaries

The app was tested in demo mode without real payment, airline, rail, Gemini or Supabase credentials. Provider-side authentication, Google OAuth, real delivery of password-recovery emails, Razorpay test capture and provider-specific quotas still need credentialed integration testing. Demo bookings do not create supplier reservations. Sandbox refunds are not automated.

Browser audio depends on installed voices. Camera, microphone and precise location require permission and suitable browser support. These permissions were not granted for QA. Weather/currency calls returned clearly labeled fallback values in this environment. No load test or production accessibility certification is claimed.
