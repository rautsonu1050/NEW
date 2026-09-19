# Development Rules & Guidelines
## Project: YATRA-AI

This document outlines the coding standards, conventions, and architectural rules to follow when contributing to the YATRA-AI codebase. Adhering to these rules ensures consistency, performance, and reliability across the platform.

### 1. General Principles
- **TypeScript First:** All new code must be written in strict TypeScript. Avoid using `any`; use `unknown` if a type is truly dynamic, and validate it.
- **Edge-Native:** Remember that the backend runs on Cloudflare Workers. Do not use Node.js-specific modules (like `fs`, `path`, or `crypto` outside of the standard web crypto API).
- **Graceful Degradation:** Always implement a demo or offline fallback for external API calls (Gemini, Amadeus, Open-Meteo). The app must be fully navigable without API keys.

### 2. Frontend (React) Rules
- **State Management:** Avoid prop-drilling. Use the `useYatra` context hook (`src/store.tsx`) to access global state, user profiles, and the unified `mutate` API function.
- **Component Design:** Keep components functional and pure where possible. Group logic by feature domain (in `src/features/`) rather than strictly by technical type.
- **Styling:** Use semantic, vanilla CSS classes. Do not introduce TailwindCSS or other utility-first frameworks without explicit project-wide approval. Keep styles clean, responsive, and dynamic (utilize hover states and micro-animations).
- **Client-Side Routing:** Follow the existing pattern in `src/App.tsx`. Do not introduce heavy third-party routers unless fundamentally necessary.

### 3. Backend & API Rules
- **Validation (Zod):** Every single API payload and external integration response MUST be validated using Zod schemas (`src/lib/validation.ts`).
- **Database (D1 & Drizzle):** 
  - Never write raw SQL strings when querying variable data to avoid SQL injection. Use Drizzle ORM or parameterized queries via the `src/server/db.ts` utilities.
  - Optimize queries for SQLite. Keep relational depth shallow where possible to ensure lightning-fast Edge responses.
- **Caching:** Always use the `cached()` utility for third-party API calls (e.g., Weather, Currency) to avoid rate limits and minimize latency.

### 4. AI & Gemini Integration
- **System Prompts:** Keep system prompts concise and focused on the persona ("YATRA, an India travel assistant").
- **Structured Output:** When querying Gemini for data that the UI needs to render (like itineraries or navigation actions), always pass a strict JSON Schema via `responseJsonSchema` and parse the result using Zod.
- **Vision Models:** When using Gemini Vision, ensure image sizes are kept small (validate max 5MB before sending) and provide explicit instructions to prevent hallucinations (e.g., "State uncertainty. Never fabricate verified prices").

### 5. Workflow & Verification
- **Typechecking:** Always run `npm run typecheck` to verify TypeScript integrity before committing any code.
- **Formatting:** Ensure code is properly formatted (using Prettier/ESLint if configured in the workspace) to maintain readability.
- **PRs and Artifacts:** When planning major architectural changes or schema updates, document them in an `implementation_plan.md` for review before executing.
