"use client";
import { lazy, Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { YatraProvider, useYatra } from "./store";
import Shell from "./components/shell";
import { Loading, Empty, Button } from "./components/shared";
const Home = lazy(() => import("./features/home"));
const Planner = lazy(() => import("./features/planner"));
const Explore = lazy(() => import("./features/explore"));
const Place = lazy(() =>
  import("./features/explore").then((m) => ({ default: m.PlaceDetails })),
);
const Trips = lazy(() => import("./features/trips"));
const Stays = lazy(() => import("./features/bookings"));
const Bookings = lazy(() =>
  import("./features/bookings").then((m) => ({ default: m.Bookings })),
);
const Budget = lazy(() =>
  import("./features/bookings").then((m) => ({ default: m.Budget })),
);
const Toolkit = lazy(() => import("./features/tools"));
const Currency = lazy(() =>
  import("./features/tools").then((m) => ({ default: m.Currency })),
);
const MapPage = lazy(() => import("./features/map"));
const Assistant = lazy(() => import("./features/assistant"));
const Audio = lazy(() => import("./features/heritage"));
const Passport = lazy(() =>
  import("./features/heritage").then((m) => ({ default: m.Passport })),
);
const Vision = lazy(() =>
  import("./features/heritage").then((m) => ({ default: m.Vision })),
);
const Profile = lazy(() => import("./features/account"));
const Notifications = lazy(() =>
  import("./features/account").then((m) => ({ default: m.Notifications })),
);
const Auth = lazy(() =>
  import("./features/account").then((m) => ({ default: m.Auth })),
);
const Onboarding = lazy(() =>
  import("./features/account").then((m) => ({ default: m.Onboarding })),
);
const Business = lazy(() => import("./features/business"));
const Admin = lazy(() => import("./features/admin"));
function Route() {
  const path = usePathname();
  const { state, loading, error, refresh } = useYatra();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
  if (loading) return <Loading />;
  if (error && !["/login", "/register", "/auth-return"].includes(path))
    return (
      <>
        <Empty
          title="Let’s reconnect your journey."
          description={error}
          href="/login"
          action="Open sign-in"
        />
        <div className="actions mt-5">
          <Button onClick={() => void refresh()}>Try again</Button>
        </div>
      </>
    );
  if (
    path.startsWith("/business") &&
    !["business", "admin"].includes(state?.role || "")
  )
    return (
      <Empty
        title="This is the business portal."
        description="Choose the Business demo role from your profile menu, or sign in with a business account."
        href="/login"
        action="Choose a role"
      />
    );
  if (
    path.startsWith("/admin") &&
    !["admin", "authority"].includes(state?.role || "")
  )
    return (
      <Empty
        title="This page needs administrator access."
        description="Choose the Admin or Tourism Authority demo role from your profile menu."
        href="/login"
        action="Choose a role"
      />
    );
  if (path === "/" || path === "/traveler") return <Home />;
  if (path === "/traveler/trips/new") return <Planner />;
  if (path === "/traveler/trips") return <Trips view="list" />;
  if (path.startsWith("/traveler/trips/")) {
    const [, , , tripId, sub] = path.split("/");
    return (
      <Trips
        tripId={tripId}
        view={
          sub === "itinerary"
            ? "itinerary"
            : sub === "live"
              ? "live"
              : "overview"
        }
      />
    );
  }
  if (path === "/explore") return <Explore />;
  if (path.startsWith("/places/")) return <Place id={path.split("/")[2]} />;
  if (path === "/stays") return <Stays />;
  if (path === "/bookings") return <Bookings />;
  if (path === "/budget") return <Budget />;
  if (path === "/travel-toolkit") return <Toolkit />;
  if (path === "/currency") return <Currency />;
  if (path === "/map") return <MapPage />;
  if (path === "/assistant") return <Assistant />;
  if (path === "/audio-guide") return <Audio />;
  if (path === "/passport") return <Passport />;
  if (path === "/visual-lens") return <Vision />;
  if (path === "/profile") return <Profile />;
  if (path === "/notifications") return <Notifications />;
  if (path === "/login" || path === "/register" || path === "/auth-return")
    return (
      <Auth
        register={path === "/register"}
        callback={path === "/auth-return"}
      />
    );
  if (path === "/onboarding") return <Onboarding />;
  if (
    path === "/business" ||
    path === "/business/offers" ||
    path === "/business/register"
  )
    return (
      <Business
        view={
          path.endsWith("/register")
            ? "register"
            : path.endsWith("/offers")
              ? "offers"
              : "dashboard"
        }
      />
    );
  if (path === "/admin" || path.startsWith("/admin/"))
    return (
      <Admin
        view={
          path.endsWith("/businesses")
            ? "businesses"
            : path.endsWith("/analytics")
              ? "analytics"
              : path.endsWith("/integrations")
                ? "integrations"
                : "overview"
        }
      />
    );
  return (
    <Empty
      title="That path took a different turn."
      description="Find your way back to your journeys."
      href="/"
      action="Back home"
    />
  );
}
export default function YatraApp() {
  return (
    <YatraProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to main content
      </a>
      <Shell>
        <Suspense fallback={<Loading />}>
          <Route />
        </Suspense>
      </Shell>
    </YatraProvider>
  );
}
