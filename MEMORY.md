# Project Memory & Agent Knowledge Base
## Project: YATRA-AI

This file serves as a memory bank for AI agents and developers working on this project. It tracks critical context, historical decisions, and "gotchas" to prevent repetitive mistakes.

### 1. Technology Stack & Constraints
- **Runtime:** Cloudflare Workers (Edge). **CRITICAL:** Standard Node.js modules (`fs`, `path`, `crypto`, `child_process`) are NOT available. Use Web APIs (`fetch`, Web Crypto).
- **Database:** Cloudflare D1 (Serverless SQLite).
- **ORM:** Drizzle ORM.
- **Styling:** Vanilla CSS only. **Do not use TailwindCSS.** The project relies on custom classes (e.g., `.trip-list-card`, `.offer-card`) to enforce a highly premium, glassmorphism-heavy design language.

### 2. Core Architectural Patterns
- **The `mutate` Function:** Client-side API calls are heavily abstracted through the `mutate(action, payload)` function provided by `useYatra`. Do not use raw `fetch` on the frontend for app state modifications.
- **Graceful Degradation (Demo Mode):** YATRA-AI is designed to be fully functional as a demo even without 3rd-party API keys (Gemini, Amadeus, Razorpay, Open-Meteo). 
  - **Rule:** If you add a new API integration, you MUST provide a fallback mock data path wrapped in `demoSource()` so the app doesn't crash when environment variables are missing.
- **Environment Variables:** Secrets are accessed via `setting("KEY_NAME")` imported from `src/server/db.ts`. In a local dev environment without a `wrangler.toml` or `.dev.vars`, this falls back to `process.env`.

### 3. Historical Context & Fixes
- **AI Assistant Routing:** The AI chat assistant originally used static regexes to route users to features. It has since been upgraded to use **Gemini Function Calling (Structured JSON Outputs)** to dynamically interpret intent and return relative URLs (e.g., `/passport`, `/business`, `/explore`). However, the robust regex fallback remains crucial for users lacking a `GEMINI_API_KEY`.
- **Proximity Sorting:** Local business offers have been enhanced with `lat`/`lng` data. The UI dynamically computes spherical distance from the user's active city coordinates and sorts offers to prioritize proximity. Business owner UI now auto-fills coordinates based on city selection to reduce friction.

### 4. Code Quality Directives
- **Zod Validation:** Every external input (API payloads, DB reads where schemas might drift, and LLM generated JSON) must be validated with Zod.
- **TypeScript:** Strict type-checking is enforced. Run `npm run typecheck` before finalizing any logic changes. Do not use `any`.

### 5. AI Interaction Rules (Self-Correction)
- When generating UI components, prioritize aesthetics. Use rich colors, soft shadows, and clean typography. Avoid basic MVP designs; YATRA-AI is a high-end application.
- If asked to modify backend routes, always check `src/server/controller.ts` where the master routing switch exists, rather than looking for standard Express/Next.js route files.
