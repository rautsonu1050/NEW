# Task Backlog & Roadmap
## Project: YATRA-AI

This document tracks the ongoing development tasks, planned features, and technical debt for YATRA-AI.

### 🚀 Upcoming Features (High Priority)
- [ ] **Live Rail API Integration:** Replace the static demo train routes with a live integration to the IRCTC or a verified 3rd-party rail aggregator API to fetch real-time ticket availability.
- [ ] **Multi-turn AI Assistant Memory:** Upgrade the `assistant` endpoint to store and retrieve previous chat messages in the database, allowing Gemini to remember the context of an ongoing conversation rather than just single-turn prompts.
- [ ] **Geofenced Push Notifications:** Implement browser push notifications to alert travelers when they walk within a 500-meter radius of an active, highly-rated Local Business Offer.
- [ ] **Trip Sharing & Collaboration:** Allow users to generate a unique shareable link for their itineraries so travel groups can view and suggest edits to the plan collaboratively.

### 🛠️ Enhancements (Medium Priority)
- [ ] **Production Booking Flow:** Move the Razorpay integration from test/sandbox mode to production. Implement secure webhooks to verify payments and finalize booking states in the database.
- [ ] **Expanded City Catalog:** Add comprehensive demo data (places, default coordinates, rich imagery, and color themes) for at least 5 major Tier-2 Indian cities (e.g., Mysore, Pune, Chandigarh).
- [ ] **Dynamic Accessibility Filtering:** Ensure that when a user selects "Wheelchair-friendly routes" in their profile, the AI Engine strictly filters out non-compliant Places from the deterministic planner.

### 🔧 Tech Debt & Maintenance (Low Priority)
- [ ] **Image Optimization:** Migrate static placeholder images in the `public/images/` folder to modern `.webp` formats to reduce bundle size and improve LCP (Largest Contentful Paint).
- [ ] **E2E Testing:** Setup Playwright or Cypress to establish end-to-end testing for the core user flows: user registration, trip generation, and business offer creation.
- [ ] **Strict Content Security Policy (CSP):** Implement strict CSP headers in the Cloudflare Worker to prevent XSS attacks, specifically auditing external script loading for Razorpay.

### ✅ Recently Completed
- [x] **Proximity-Based Offers:** Offers are now dynamically sorted by distance from the user's active city coordinates, displaying exact location, price, and food highlights.
- [x] **Dynamic AI Routing:** The chat assistant successfully uses Gemini function-calling to intelligently route users to any app feature (e.g., Passport, Visual Lens, Explore) based on natural language intent.
