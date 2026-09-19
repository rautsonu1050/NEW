# UI/UX & Design System
## Project: YATRA-AI

This document outlines the design philosophy, aesthetic principles, and UI/UX patterns that drive the user experience in YATRA-AI.

### 1. Design Philosophy
YATRA-AI is built to evoke a sense of premium exploration. The UI must be **visually stunning, dynamic, and intuitive**, serving both as a functional tool and an inspiring showcase of destinations. We prioritize rich aesthetics, fluid interactions, and absolute clarity over generic, templated layouts.

### 2. Core Aesthetics
- **Modern & Premium:** The app shuns basic utility designs in favor of sleek, modern web paradigms. We utilize glassmorphism (subtle blurs and transparencies), soft drop shadows, and rounded geometric containers.
- **Dynamic Theming:** The aesthetic adapts to the user's journey. Each destination (e.g., Delhi, Jaipur, Goa) carries its own curated hex color code (defined in `src/data/cities.ts`). The UI accents, buttons, and backgrounds dynamically shift to reflect the current active city, creating a deep sense of place.
- **Rich Media First:** High-quality imagery is heavily prioritized. Destination cards, food items, and monument scans use edge-to-edge photography with readable typography overlaid on protective gradients.

### 3. Typography
We utilize modern, highly readable sans-serif web fonts (such as Inter, Outfit, or Roboto).
- **Headings (`h1`, `h2`, `h3`):** Bold, tightly tracked, and used sparingly to establish clear visual hierarchy.
- **Body Text:** Optimized for readability on mobile devices, with generous line height and subdued contrast (e.g., slate grays rather than pure black) to reduce eye strain during long planning sessions.

### 4. Interaction & Micro-Animations
An interface that feels alive encourages interaction.
- **Hover States:** All interactive elements (buttons, offer cards, navigation links) feature distinct, smooth hover effects (scaling, shadow elevation, or subtle color shifts).
- **Feedback:** Actions like saving a trip or capturing a Visual Lens image provide immediate visual feedback (toast notifications, loading spinners) so the user never feels disconnected.

### 5. Layout Patterns
- **Mobile-First Responsiveness:** While fully functional on desktop, the application is designed with a mobile-first mindset, catering to travelers on the go.
- **The "Card" Paradigm:** Information is encapsulated in cards (`trip-list-card`, `offer-card`). This allows complex data (like distance, price, food details, and imagery) to be digested quickly.
- **Sticky Actions:** Key actions (like the Chat Assistant input or "Save Trip" buttons) remain anchored to the viewport for rapid accessibility.

### 6. Accessibility (a11y)
Design goes beyond visuals. YATRA-AI incorporates accessibility into its core:
- **Contrast Ratios:** Text against dynamic backgrounds always utilizes gradients or overlays to ensure WCAG-compliant contrast.
- **Semantic HTML:** Deep usage of `<article>`, `<section>`, and `<nav>` elements to ensure screen readers can navigate complex itineraries.
- **Customized Profiles:** Users can set accessibility preferences (e.g., wheelchair-friendly routes, audio guidance), which structurally changes how the AI presents and filters destinations.
