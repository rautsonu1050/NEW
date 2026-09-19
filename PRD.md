# Product Requirements Document (PRD)
## Project Name: YATRA-AI

### 1. Product Overview
**YATRA-AI** is a comprehensive, AI-powered travel assistant and ecosystem tailored for exploring India. It bridges the gap between trip planning, on-trip live assistance, and local business discovery. Utilizing advanced generative AI (Google Gemini), it offers hyper-personalized itineraries, context-aware navigational chat, and computer vision-based exploration tools for travelers, while offering a robust portal for local businesses to reach tourists.

### 2. Target Audience & User Roles
1. **Traveler:** The primary user. Needs seamless trip planning, local recommendations, cultural context (vision/audio guides), and real-time contingency handling (e.g., weather delays).
2. **Business Partner (Local Merchant):** Local restaurants, tour guides, and shop owners who wish to publish proximity-based, time-sensitive offers directly to travelers.
3. **Administrator / Tourism Authority:** Platform overseers who track macro-level analytics, verify business identities, and monitor system integrations.

### 3. Core Features

#### 3.1 AI-Driven Travel Planning
- **Smart Itineraries:** Users input parameters (budget, travel group, transport preferences, food choices, accessibility needs) and Gemini (or a deterministic fallback engine) creates a day-by-day itinerary.
- **Live "Fix My Trip":** Dynamic adjustment feature allowing travelers to alter plans on the fly due to unforeseen circumstances like rain, delays, or closures.

#### 3.2 AI Assistant & Navigation
- **Context-Aware Chat:** A conversational assistant that understands travel intent (e.g., "I need cheap food", "Show my trip plans", "Translate this") and dynamically routes the user to the correct app feature (e.g., Budget, Explore, Trips dashboard).
- **Graceful Degradation:** Functions in a "rules-based" offline mode if API keys are not provided, ensuring the demo always functions beautifully.

#### 3.3 Explore & Proximity Offers
- **Catalog Navigation:** Discover curated Places, Stays, and Experiences.
- **Local Business Offers:** A marketplace where travelers see geo-targeted discounts and menus from verified local merchants. Offers are dynamically sorted by proximity (distance calculated from the traveler's active city coordinates).

#### 3.4 AI Heritage & Exploration Tools
- **Visual Lens:** Integrates Gemini Vision to analyze user-uploaded photos. Users can scan monuments for historical context, translate local signboards, or identify street food.
- **Audio Guides:** Location-specific stories and narratives with AI-powered on-the-fly translation between English and Hindi.

#### 3.5 Travel Toolkit & Utilities
- **Travel Passport:** A secure vault for users to store tickets, reservations, and travel authorizations.
- **Real-Time Data Utilities:** 
  - Weather forecasting via Open-Meteo API.
  - Live currency conversion caching.
  - Route mapping via Google Routes API.
  - Flight and train search mocks via Amadeus and rail APIs.

#### 3.6 Partner Dashboard
- **Verification System:** Businesses can upload identity documents for Admin verification via cloud storage.
- **Offer Management:** Merchants can create real-time offers featuring specific food highlights, original pricing, active time windows, and exact geographical coordinates (auto-filled for convenience).

### 4. Technical Architecture
- **Frontend Framework:** React, utilizing modern hooks and context (`useYatra`) for global state management. 
- **Styling:** Custom CSS tailored for a premium, dynamic aesthetic.
- **Backend / Database:** Powered by Edge computing (Cloudflare Workers environment) utilizing D1 (SQLite) and Drizzle ORM for fast, localized data operations.
- **Validation:** Zod schemas for robust end-to-end type safety between the UI forms, API, and LLM structured JSON outputs.

### 5. Future Roadmap / Success Metrics
- **Metrics:** Track AI usage (number of Vision scans, chat prompts), itinerary conversion rates, and business offer clicks.
- **Roadmap:** Expand to live booking capability beyond Razorpay sandbox, integrate live train inventory (IRCTC), and expand the default AI catalog to more Tier-2 Indian cities.
