/**
 * Map Component
 *
 * Handles UI rendering and state management for the map feature.
 */
"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  ArrowLeft,
  ArrowRight,
  LocateFixed,
  Heart,
  Trash2,
  Save,
  CheckCircle2,
  TrainFront,
} from "lucide-react";
import { toast } from "sonner";
import { useYatra } from "../store";
import { api, money } from "../lib/utils";
import { loadScript } from "../lib/browser";
import type { Item, Provenance } from "../lib/types";
import {
  PageTitle,
  SelectField,
  Button,
  Empty,
  SourceBadge,
  Confirm,
  TabBar,
} from "../components/shared";
function decodePolyline(str: string) {
  let index = 0,
    lat = 0,
    lng = 0;
  const output: { lat: number; lng: number }[] = [];
  while (index < str.length) {
    let shift = 0,
      result = 0,
      b;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 31) << shift;
      shift += 5;
    } while (b >= 32);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 31) << shift;
      shift += 5;
    } while (b >= 32);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    output.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return output;
}
/** Renders the MapPage view. */
export default function MapPage() {
  const params = useSearchParams();
  const { state, trip: active, mutate } = useYatra();
  const trip =
    state?.trips.find((t) => t.id === params.get("tripId")) || active;
  const [day, setDay] = useState(params.get("day") || "1");
  const [step, setStep] = useState(0);
  useEffect(() => setDay(params.get("day") || "1"), [params]);
  const [tab, setTab] = useState("Route");
  const [route, setRoute] = useState<{ data: any; source: Provenance } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [clear, setClear] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const ref = useRef<HTMLDivElement>(null);
  const current =
    trip?.days.find((d) => d.number === Number(day)) || trip?.days[0];
  const items = current?.items || [];
  const item = items[Math.min(step, items.length - 1)];
  useEffect(() => {
    setStep(0);
    if (trip)
      api<any>("map?tripId=" + trip.id + "&day=" + day)
        .then(setRoute)
        .catch((e) => setError(e.message));
  }, [trip?.id, trip?.version, day]);
  useEffect(() => {
    if (!ref.current || !items.length) return;
    let cancelled = false;
    let map: any;
    const build = async () => {
      try {
        const config = await api<{ googleMapsKey: string }>("config");
        const points: Item[] = items.filter(
          (x, i) =>
            items.findIndex((y) => y.lat === x.lat && y.lng === x.lng) === i,
        );
        const line = route?.data.polyline?.encodedPolyline
          ? decodePolyline(route.data.polyline.encodedPolyline)
          : points.map((x) => ({ lat: x.lat, lng: x.lng }));
        if (config.googleMapsKey) {
          try {
            await loadScript(
              "https://maps.googleapis.com/maps/api/js?key=" +
                encodeURIComponent(config.googleMapsKey),
            );
            if (cancelled || !ref.current) return;
            map = new window.google.maps.Map(ref.current, {
              center: points[0],
              zoom: 12,
              mapTypeControl: false,
              streetViewControl: false,
            });
            const bounds = new window.google.maps.LatLngBounds();
            points.forEach((p, i) => {
              new window.google.maps.Marker({
                position: { lat: p.lat, lng: p.lng },
                map,
                title: p.title,
                label: String(i + 1),
              });
              bounds.extend({ lat: p.lat, lng: p.lng });
            });
            new window.google.maps.Polyline({
              path: line,
              strokeColor: "#5B4CF0",
              strokeWeight: 4,
              map,
            });
            if (position)
              new window.google.maps.Marker({
                position,
                map,
                title: "Your location",
              });
            map.fitBounds(bounds);
            return;
          } catch {}
        }
        if (!document.querySelector("link[data-yatra-map]")) {
          const css = document.createElement("link");
          css.rel = "stylesheet";
          css.href = "/vendor/leaflet.css";
          css.dataset.yatraMap = "true";
          document.head.appendChild(css);
        }
        await loadScript("/vendor/leaflet.js");
        if (cancelled || !ref.current) return;
        const L = window.L;
        map = L.map(ref.current, { scrollWheelZoom: false }).setView(
          [points[0].lat, points[0].lng],
          12,
        );
        const tiles = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
          },
        );
        let tileErrorShown = false;
        tiles.on("tileerror", () => {
          if (!tileErrorShown && !cancelled) {
            tileErrorShown = true;
            setError(
              "Map tiles are unavailable. The stop list and external navigation remain available.",
            );
          }
        });
        tiles.addTo(map);
        points.forEach((p, i) => {
          const marker = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              className: "",
              html: '<span class="map-pin">' + (i + 1) + "</span>",
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          }).addTo(map);
          const label = document.createElement("span");
          label.textContent = p.title;
          marker.bindPopup(label);
          marker.on("click", () =>
            setStep(items.findIndex((x) => x.id === p.id)),
          );
        });
        L.polyline(
          line.map((p: any) => [p.lat, p.lng]),
          {
            color: "#7160d4",
            weight: 4,
            dashArray: route?.source.status === "live" ? undefined : "7 8",
          },
        ).addTo(map);
        if (position)
          L.circleMarker([position.lat, position.lng], {
            radius: 8,
            color: "#fff",
            weight: 3,
            fillColor: "#3B82F6",
            fillOpacity: 1,
          }).addTo(map);
        if (points.length > 1)
          map.fitBounds(
            points.map((p) => [p.lat, p.lng]),
            { padding: [40, 40] },
          );
        setTimeout(() => {
          if (!cancelled) map.invalidateSize();
        }, 250);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void build();
    return () => {
      cancelled = true;
      if (map?.remove) map.remove();
    };
  }, [trip?.id, trip?.version, day, route, position]);
  if (!trip || !current || !items.length)
    return (
      <Empty
        title="A route starts with a journey"
        description="Add a few stops to your itinerary, then find your way here."
        href="/traveler/trips/new"
      />
    );
  const locate = () =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (p) => {
            setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
            toast.success("Your location is shown on the map");
          },
          () =>
            toast.error(
              "Location is unavailable. Navigate from your selected stop instead.",
            ),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        )
      : toast.error("Location is not supported.");
  return (
    <>
      <PageTitle
        eyebrow="FIND YOUR WAY, AT YOUR PACE"
        title={trip.preferences.destination + ", one stop at a time."}
        description="Your itinerary on the map, with practical directions when you need them."
        actions={
          <>
            <SelectField
              label="Day"
              value={day}
              onChange={setDay}
              options={trip.days.map((d) => ({
                value: String(d.number),
                label: "Day " + d.number,
              }))}
            />
            <Button variant="secondary" onClick={locate}>
              <LocateFixed size={15} />
              My location
            </Button>
            <Button
              onClick={() =>
                void mutate(
                  "routes",
                  { tripId: trip.id, day: Number(day) },
                  "Route saved",
                ).catch(() => {})
              }
            >
              <Save size={15} />
              Save route
            </Button>
          </>
        }
      />
      <div className="map-layout">
        <section className="panel">
          <TabBar
            value={tab}
            onChange={setTab}
            options={["Route", "Landmarks", "Saved"]}
          />
          {tab === "Route" && (
            <>
              {items.map((p, i) => (
                <button
                  key={p.id}
                  className={
                    "map-stop w-full text-left " + (step === i ? "active" : "")
                  }
                  onClick={() => setStep(i)}
                >
                  <span className="stop-number">{i + 1}</span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>
                      {p.time} · {p.travelMinutes} min travel ·{" "}
                      {p.distance.toFixed(1)} km
                    </p>
                  </div>
                </button>
              ))}
              <div className="actions mt-5">
                <Button
                  variant="secondary"
                  disabled={step === 0}
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ArrowLeft size={14} />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={step >= items.length - 1}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next
                  <ArrowRight size={14} />
                </Button>
              </div>
              {item && (
                <>
                  <a
                    className="btn btn-primary w-full mt-4"
                    target="_blank"
                    rel="noreferrer"
                    href={
                      "https://www.google.com/maps/dir/?api=1&destination=" +
                      item.lat +
                      "," +
                      item.lng
                    }
                  >
                    <Navigation size={15} />
                    Navigate to stop {step + 1}
                  </a>
                  <Button
                    className="w-full mt-2"
                    variant="ghost"
                    onClick={() =>
                      void mutate(
                        "trips/update",
                        {
                          tripId: trip.id,
                          version: trip.version,
                          day: current.number,
                          action: "complete",
                          itemId: item.id,
                        },
                        "Stop updated",
                      ).catch(() => {})
                    }
                  >
                    <CheckCircle2 size={15} />
                    {item.completed ? "Undo arrival" : "Mark stop completed"}
                  </Button>
                </>
              )}
            </>
          )}
          {tab === "Landmarks" && (
            <>
              <h3>{item?.title}</h3>
              <p className="muted mt-3">
                Use the official entrance and any station signs for your
                destination. Exact local landmark instructions are unverified.
              </p>
              <div className="hint">
                <TrainFront size={20} />
                <p>
                  Public transport → designated auto stand → venue entrance.
                  Confirm service routes and fares locally.
                </p>
              </div>
              <p className="inline-note">
                Choose the mode in Google Maps for actual walking, driving, or
                public transport directions.
              </p>
              <Link href="/travel-toolkit" className="text-action">
                Interpret a local address
                <ArrowRight size={14} />
              </Link>
            </>
          )}
          {tab === "Saved" && (
            <>
              {state?.routes.length ? (
                state.routes.map((r) => (
                  <div className="map-stop" key={r.id}>
                    <Link href={"/map?tripId=" + r.tripId + "&day=" + r.day}>
                      <h3>{r.title}</h3>
                      <p>{new Date(r.createdAt).toLocaleDateString()}</p>
                    </Link>
                    <button
                      className="ml-auto"
                      aria-label={"Favorite " + r.title}
                      onClick={() =>
                        void mutate("routes/update", {
                          id: r.id,
                          action: "favorite",
                        }).catch(() => {})
                      }
                    >
                      <Heart
                        size={15}
                        fill={r.favorite ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      aria-label={"Delete " + r.title}
                      onClick={() =>
                        void mutate(
                          "routes/update",
                          { id: r.id, action: "delete" },
                          "Route removed",
                        ).catch(() => {})
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted">Save this route to find it here later.</p>
              )}
              <Button
                variant="ghost"
                onClick={() => setClear(true)}
                disabled={!state?.routes.length}
              >
                Clear route history
              </Button>
            </>
          )}
        </section>
        <section className="map-panel">
          <div
            ref={ref}
            className="map-canvas"
            aria-label="Interactive map with itinerary stops"
          />
          <div className="map-info">
            {route && <SourceBadge source={route.source} />}
            <p>
              {error ||
                route?.source.message ||
                "Road route from Google Routes."}
            </p>
            <p>
              Coordinates from your destination catalog. Route estimates do not
              account for live traffic unless provided by a configured routing
              service.
            </p>
          </div>
        </section>
      </div>
      <Confirm
        open={clear}
        onClose={() => setClear(false)}
        title="Clear saved routes?"
        description="This removes saved route shortcuts. Your trip itineraries remain available."
        onConfirm={() =>
          void mutate(
            "routes/update",
            { action: "clear" },
            "Route history cleared",
          )
            .then(() => setClear(false))
            .catch(() => {})
        }
      />
    </>
  );
}
