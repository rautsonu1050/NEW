/**
 * Trips Component
 *
 * Handles UI rendering and state management for the trips feature.
 */
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  Users,
  MapPin,
  Wallet,
  Clock,
  Navigation,
  Sparkles,
  Trash2,
  Check,
  RefreshCw,
  ArrowLeftRight,
  HeartPulse,
  ShieldCheck,
  CloudRain,
  TriangleAlert,
  LocateFixed,
  TrainFront,
  CloudSun,
  CheckCircle2,
  Timer,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { useYatra } from "../store";
import { cities } from "../data/cities";
import type {
  Trip,
  Item,
  Recovery,
  Catalog,
  Incident,
  Place,
} from "../lib/types";
import { api, money, dateLabel } from "../lib/utils";
import { health } from "../lib/health";
import {
  Photo,
  PageTitle,
  LinkButton,
  Button,
  Empty,
  Stat,
  SectionTitle,
  SourceBadge,
  Modal,
  SelectField,
  Confirm,
  Meter,
} from "../components/shared";
const issues = [
  "Heavy rain",
  "Attraction closed",
  "Train delayed",
  "Flight delayed",
  "Traffic congestion",
  "Running late",
  "Transport unavailable",
  "Hotel cancellation",
  "Budget overrun",
  "Medical requirement",
  "Route blocked",
  "Crowd surge",
];
/** Renders the Trips view. */
export default function Trips({
  view,
  tripId,
}: {
  view: "list" | "overview" | "itinerary" | "live";
  tripId?: string;
}) {
  const { state, trip: active, mutate } = useYatra();
  const router = useRouter();
  const trip = tripId ? state?.trips.find((t) => t.id === tripId) : active;
  const [remove, setRemove] = useState(false);
  if (view === "list")
    return (
      <>
        <PageTitle
          eyebrow="CHAPTERS WORTH KEEPING"
          title="Your journeys."
          description="Every itinerary, all in one place."
          actions={
            <LinkButton href="/traveler/trips/new">
              <Plus size={16} />
              Plan a new journey
            </LinkButton>
          }
        />
        {!state?.trips.length ? (
          <Empty
            title="Your next story starts here"
            description="Build a personal itinerary with a little help from YATRA."
            href="/traveler/trips/new"
          />
        ) : (
          <div className="grid-three">
            {state.trips.map((t) => (
              <article className="trip-list-card" key={t.id}>
                <Photo
                  src={
                    cities.find((c) => c.name === t.preferences.destination)
                      ?.image || ""
                  }
                  alt={t.preferences.destination}
                />
                <div>
                  <SourceBadge source={t.source} compact />
                  <h2>{t.title}</h2>
                  <p>
                    {dateLabel(t.preferences.startDate)} -{" "}
                    {dateLabel(t.preferences.endDate)} ·{" "}
                    {t.preferences.travelers} travelers
                  </p>
                  <p className="mt-2">
                    {t.days.length} days · {money(t.preferences.budget)} budget
                  </p>
                  <div className="actions">
                    <LinkButton href={"/traveler/trips/" + t.id}>
                      Open trip
                      <ArrowRight size={15} />
                    </LinkButton>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        void mutate(
                          "trips/active",
                          { tripId: t.id },
                          "Active trip updated",
                        ).catch(() => {})
                      }
                    >
                      {state.activeTripId === t.id
                        ? "Active journey"
                        : "Make active"}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {state?.demo && (
          <div className="actions mt-6">
            <Button
              variant="secondary"
              onClick={() =>
                void mutate<Trip>("trips/sample", {}, "Sample trip created")
                  .then((t) => router.push("/traveler/trips/" + t.id))
                  .catch(() => {})
              }
            >
              Load sample Delhi trip
            </Button>
          </div>
        )}
      </>
    );
  if (!trip)
    return (
      <Empty
        title="Choose a journey first"
        description="Open a saved trip or create a new itinerary."
        href="/traveler/trips"
        action="My Trips"
      />
    );
  if (view === "itinerary") return <Itinerary trip={trip} />;
  if (view === "live") return <LiveTrip trip={trip} />;
  const score = health(trip);
  const spent =
    state?.expenses
      .filter((x) => x.tripId === trip.id)
      .reduce((n, e) => n + e.amount, 0) || 0;
  return (
    <>
      <div className="trip-overview-hero">
        <Photo
          src={
            cities.find((c) => c.name === trip.preferences.destination)
              ?.image || ""
          }
          alt={trip.preferences.destination}
        />
        <div>
          <SourceBadge source={trip.source} />
          <h1>{trip.title}</h1>
          <p>
            {dateLabel(trip.preferences.startDate)} -{" "}
            {dateLabel(trip.preferences.endDate)} · {trip.days.length} days ·{" "}
            {trip.preferences.travelers} travelers
          </p>
          <div className="actions">
            <LinkButton href={"/traveler/trips/" + trip.id + "/itinerary"}>
              Full itinerary
              <ArrowRight size={16} />
            </LinkButton>
            <LinkButton href={"/traveler/trips/" + trip.id + "/live"} secondary>
              <HeartPulse size={16} />
              Open Live Trip
            </LinkButton>
            <LinkButton href={"/map?tripId=" + trip.id} secondary>
              <MapPin size={16} />
              View on map
            </LinkButton>
          </div>
        </div>
      </div>
      <div className="grid-four">
        <Stat
          label="Total trip budget"
          value={money(trip.preferences.budget)}
          icon={Wallet}
        />
        <Stat
          label="Estimated travel costs"
          value={money(trip.estimate)}
          sub="Forecast, excluding reserves"
          icon={Coins}
        />
        <Stat
          label="Recorded expenses"
          value={money(spent)}
          icon={TicketIcon}
        />
        <Stat
          label="Emergency reserve"
          value={money(trip.emergency)}
          sub="12% set aside for the unexpected"
          icon={ShieldCheck}
          color="green"
        />
      </div>
      <div className="content-grid mt-6">
        <section className="panel">
          <SectionTitle title="A journey, one day at a time" />
          {trip.days.map((d) => (
            <div className="overview-day" key={d.number}>
              <div className="day-number">
                <small>DAY</small>
                {d.number}
              </div>
              <div>
                <h3>{d.title}</h3>
                <p>
                  {dateLabel(d.date)} · {d.items.length} stops ·{" "}
                  {d.items
                    .slice(0, 2)
                    .map((i) => i.title.split(" (")[0])
                    .join(", ")}
                </p>
              </div>
              <Link
                aria-label={"View day " + d.number}
                href={
                  "/traveler/trips/" + trip.id + "/itinerary?day=" + d.number
                }
              >
                <ArrowRight size={18} />
              </Link>
            </div>
          ))}
          <h3 className="mt-6">A few details to keep in mind</h3>
          <ul className="notes-list">
            {trip.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <div className="actions mt-5">
            <Button variant="ghost" onClick={() => setRemove(true)}>
              <Trash2 size={15} />
              Clear itinerary
            </Button>
            <LinkButton href="/traveler/trips/new" secondary>
              <Plus size={15} />
              Plan new journey
            </LinkButton>
          </div>
        </section>
        <aside className="panel">
          <h3>Your trip, in balance</h3>
          <div className="health-large">
            <div
              className="health-ring"
              style={{ "--score": score.overall + "%" } as React.CSSProperties}
            >
              <strong>
                {score.overall}
                <small>PLANNING SCORE</small>
              </strong>
            </div>
          </div>
          {Object.entries(score)
            .filter(([k]) => k !== "overall")
            .map(([k, v]) => (
              <Meter
                key={k}
                label={k.charAt(0).toUpperCase() + k.slice(1)}
                value={v}
              />
            ))}
          <p className="inline-note">
            A planning estimate. Live traffic, crowds and venue access are not
            verified.
          </p>
          <div className="hint green">
            <ShieldCheck size={18} />
            <p>
              {money(trip.buffer)} flexible buffer, in addition to your
              emergency reserve.
            </p>
          </div>
        </aside>
      </div>
      <Confirm
        open={remove}
        onClose={() => setRemove(false)}
        title="Clear this itinerary?"
        description="This removes the trip and its stops. Existing bookings and expenses will remain in your account."
        onConfirm={() =>
          void mutate("trips/delete", { tripId: trip.id }, "Itinerary removed")
            .then(() => router.push("/traveler/trips"))
            .catch(() => {})
        }
      />
    </>
  );
}
function TicketIcon({ size }: { size?: number }) {
  return <CalendarDays size={size} />;
}
function Itinerary({ trip }: { trip: Trip }) {
  const { mutate, weather } = useYatra();
  const [day, setDay] = useState(1);
  const [edit, setEdit] = useState<{ action: string; item?: Item } | null>(
    null,
  );
  const [selected, setSelected] = useState("");
  const [time, setTime] = useState("09:00");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [remove, setRemove] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("day"));
    if (n >= 1 && n <= trip.days.length) setDay(n);
    api<Catalog>("catalog?city=" + trip.preferences.destination)
      .then(setCatalog)
      .catch(() => {});
  }, [trip.id, trip.preferences.destination, trip.days.length]);
  const current = trip.days.find((d) => d.number === day) || trip.days[0];
  const places =
    catalog?.places.filter(
      (p) => !trip.days.some((d) => d.items.some((i) => i.placeId === p.id)),
    ) || [];
  const update = async (
    action: string,
    itemId?: string,
    extras: Record<string, unknown> = {},
  ) => {
    setBusy(true);
    try {
      await mutate(
        "trips/update",
        {
          tripId: trip.id,
          version: trip.version,
          day: current.number,
          action,
          itemId,
          ...extras,
        },
        "Itinerary updated",
      );
      setEdit(null);
      setRemove(null);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow={trip.preferences.destination.toUpperCase() + " · YOUR WAY"}
        title="Make room for the memorable."
        description="A flexible plan. The freedom to make it yours."
        actions={
          <>
            <LinkButton href={"/traveler/trips/" + trip.id + "/live"} secondary>
              <HeartPulse size={16} />
              Live Trip
            </LinkButton>
            <LinkButton
              href={"/map?tripId=" + trip.id + "&day=" + day}
              secondary
            >
              <MapPin size={16} />
              Map
            </LinkButton>
          </>
        }
      />
      {weather &&
        weather.city === trip.preferences.destination &&
        (weather.rain || 0) >= 60 && (
          <div className="incident-banner">
            <CloudRain size={23} />
            <div>
              <b>Rain may affect outdoor stops.</b>
              <p className="muted">
                {weather.source.status === "demo"
                  ? "Sample weather scenario."
                  : "Forecast probability: " + weather.rain + "%."}
              </p>
            </div>
            <LinkButton href={"/traveler/trips/" + trip.id + "/live"} secondary>
              Review indoor alternatives
            </LinkButton>
          </div>
        )}
      <div className="timeline-layout">
        <nav className="day-nav" aria-label="Itinerary days">
          {trip.days.map((d) => (
            <button
              className={day === d.number ? "active" : ""}
              key={d.number}
              onClick={() => setDay(d.number)}
            >
              Day {d.number}
              <small>{dateLabel(d.date)}</small>
            </button>
          ))}
        </nav>
        <section>
          <div className="timeline-top">
            <div>
              <h2>{current.title}</h2>
              <p className="muted">
                {current.items.length} stops · {dateLabel(current.date)}
              </p>
            </div>
            <Button
              variant="secondary"
              busy={busy}
              onClick={() => void update("optimize")}
            >
              <Sparkles size={14} />
              Optimize day
            </Button>
          </div>
          {current.items.length ? (
            current.items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && (
                  <div className="timeline-travel">
                    <Navigation size={12} />
                    {item.distance.toFixed(1)} km · about {item.travelMinutes}{" "}
                    min · estimated route
                  </div>
                )}
                <article
                  className={
                    "timeline-card " +
                    (item.replaced ? "replaced " : "") +
                    (item.completed ? "completed" : "")
                  }
                >
                  <div className="timeline-time">
                    {item.time}
                    <span />
                  </div>
                  <Photo
                    src={item.image}
                    alt={
                      trip.preferences.destination + " destination photograph"
                    }
                  />
                  <div className="timeline-content">
                    <small>
                      {item.replaced
                        ? "ADAPTED TO YOUR JOURNEY"
                        : item.category.toUpperCase()}
                    </small>
                    <h3>{item.title}</h3>
                    <div className="timeline-meta">
                      <span>
                        <Clock size={12} />
                        {item.duration} min
                      </span>
                      <span>{money(item.cost)} for your group</span>
                      <span>{item.indoor ? "Indoor" : "Outdoor"}</span>
                    </div>
                    <p className="timeline-reason">{item.reason}</p>
                    <div className="timeline-actions">
                      <button onClick={() => void update("complete", item.id)}>
                        <CheckCircle2 size={12} />
                        {item.completed ? "Undo done" : "Mark done"}
                      </button>
                      <a
                        href={
                          "https://www.google.com/maps/dir/?api=1&destination=" +
                          (item.category === "Food"
                            ? encodeURIComponent(
                                item.title + " " + trip.preferences.destination,
                              )
                            : item.lat + "," + item.lng)
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Navigation size={12} />
                        Navigate
                      </a>
                      <button
                        onClick={() => {
                          setTime(item.time);
                          setEdit({ action: "time", item });
                        }}
                      >
                        <Clock size={12} />
                        Time
                      </button>
                      <button
                        onClick={() => {
                          setSelected(places[0]?.id || "");
                          setEdit({ action: "replace", item });
                        }}
                      >
                        <ArrowLeftRight size={12} />
                        Replace
                      </button>
                      <button
                        onClick={() => setRemove(item)}
                        aria-label={"Remove " + item.title}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            ))
          ) : (
            <Empty
              title="A day with room to breathe"
              description="Add a place from your destination catalog to begin shaping this day."
            />
          )}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setSelected(places[0]?.id || "");
              setEdit({ action: "add" });
            }}
          >
            <Plus size={16} />
            Add a stop to this day
          </Button>
          <p className="inline-note">
            Times, routes, prices and venue hours are estimates. Editing cannot
            change existing reservations.
          </p>
        </section>
        <aside className="timeline-aside">
          <div className="aside-card">
            <h3>A day at a glance</h3>
            <div className="review-grid">
              <div>
                <small>STOPS</small>
                <b>{current.items.length}</b>
              </div>
              <div>
                <small>GROUP COST</small>
                <b>{money(current.items.reduce((n, x) => n + x.cost, 0))}</b>
              </div>
              <div>
                <small>TRAVEL TIME</small>
                <b>
                  {current.items.reduce((n, x) => n + x.travelMinutes, 0)} min
                </b>
              </div>
              <div>
                <small>DESTINATION</small>
                <b>{trip.preferences.destination}</b>
              </div>
            </div>
            <SourceBadge source={trip.source} compact />
          </div>
          <div className="aside-card">
            <div className="mini-icon green">
              <LeafIcon size={19} />
            </div>
            <h3 className="mt-4">Keep a little space for discovery.</h3>
            <p className="muted mt-3">
              A slower pace leaves time for unexpected stops and local stories.
            </p>
          </div>
        </aside>
      </div>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={
          edit?.action === "time"
            ? "A different time?"
            : edit?.action === "add"
              ? "Add a little discovery."
              : "Try somewhere different."
        }
        description={
          edit?.item?.title || "Choose an attraction from your destination."
        }
      >
        {edit?.action === "time" ? (
          <div className="field">
            <label htmlFor="edit-time">New start time</label>
            <input
              id="edit-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        ) : places.length ? (
          <SelectField
            label="Choose a place"
            value={selected}
            onChange={setSelected}
            options={places.map((p) => ({ label: p.name, value: p.id }))}
          />
        ) : (
          <p className="muted">
            All available places are already in your trip. Remove a place from
            another day to move it here.
          </p>
        )}
        <Button
          busy={busy}
          disabled={edit?.action !== "time" && !selected}
          onClick={() =>
            void update(
              edit!.action,
              edit?.item?.id,
              edit?.action === "time" ? { time } : { placeId: selected },
            )
          }
        >
          Save itinerary change
        </Button>
      </Modal>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Remove this stop?"
        description={
          (remove?.title || "This stop") +
          " will be removed from this day. Any separate booking stays active."
        }
        onConfirm={() => void update("remove", remove!.id)}
      />
    </>
  );
}
function LeafIcon({ size }: { size?: number }) {
  return <ShieldCheck size={size} />;
}
function LiveTrip({ trip }: { trip: Trip }) {
  const { state, mutate, weather } = useYatra();
  const [day, setDay] = useState("1");
  const [report, setReport] = useState(false);
  const [issue, setIssue] = useState("Heavy rain");
  const current =
    trip.days.find((d) => d.number === Number(day)) || trip.days[0];
  const next = current.items.find((i) => !i.completed) || current.items[0];
  const [itemId, setItemId] = useState(next?.id || "");
  const [delay, setDelay] = useState(45);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<Recovery[]>([]);
  const [chosen, setChosen] = useState<Recovery | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [location, setLocation] = useState("Location sharing is off.");
  const [watching, setWatching] = useState(false);
  const [incident, setIncident] = useState<Incident | undefined>();
  const score = health(trip, incident);
  const spent =
    state?.expenses
      .filter((x) => x.tripId === trip.id)
      .reduce((n, e) => n + e.amount, 0) || 0;
  useEffect(() => {
    setItemId(next?.id || "");
  }, [next?.id, day]);
  useEffect(() => {
    if (!watching) return;
    if (!navigator.geolocation) {
      setLocation("Location is unavailable.");
      setWatching(false);
      return;
    }
    const w = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation(
          pos.coords.latitude.toFixed(4) +
            ", " +
            pos.coords.longitude.toFixed(4),
        );
        if (!next) return;
        const rad = Math.PI / 180;
        const dx = (next.lat - pos.coords.latitude) * 111;
        const dy =
          (next.lng - pos.coords.longitude) * 111 * Math.cos(next.lat * rad);
        if (Math.hypot(dx, dy) < 0.3)
          void mutate(
            "passport/award",
            {
              placeId: next.placeId,
              method: "GPS arrival",
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
            "Arrival stamp unlocked",
          )
            .then(() => setWatching(false))
            .catch(() => {});
      },
      () => {
        setLocation(
          "Location permission was unavailable. You can still use your itinerary.",
        );
        setWatching(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, [watching, next?.id, mutate]);
  const preview = async () => {
    setBusy(true);
    try {
      const result = await api<Recovery[]>("recovery/preview", {
        tripId: trip.id,
        type: issue,
        day: Number(day),
        itemId,
        delay,
        simulated,
      });
      setOptions(result);
      setIncident(result[0]?.incident);
      setReport(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const simulate = (type: string) => {
    setIssue(type);
    setSimulated(true);
    setReport(true);
  };
  const apply = async () => {
    if (!chosen) return;
    setBusy(true);
    try {
      await mutate(
        "recovery/apply",
        { id: chosen.id },
        "Your itinerary has adapted",
      );
      setChosen(null);
      setOptions([]);
      setIncident(undefined);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="WITH YOU, ALONG THE WAY"
        title="Your journey. In motion."
        description={
          "Live Trip · " + trip.preferences.destination + " · Day " + day
        }
        actions={
          <SelectField
            label="Trip day"
            value={day}
            onChange={setDay}
            options={trip.days.map((d) => ({
              label: "Day " + d.number,
              value: String(d.number),
            }))}
          />
        }
      />
      <div className="grid-four">
        <Stat
          label="Trip health"
          value={score.overall + "/100"}
          sub="Planning score, not a safety rating"
          icon={HeartPulse}
          color="green"
        />
        <Stat
          label="Next stop"
          value={next?.time || "All clear"}
          sub={next?.title || "No stops remaining"}
          icon={Clock}
        />
        <Stat
          label="Remaining budget"
          value={money(trip.preferences.budget - spent)}
          sub="Based on recorded expenses"
          icon={Wallet}
        />
        <Stat
          label="Emergency reserve"
          value={money(trip.emergency)}
          icon={ShieldCheck}
        />
      </div>
      <div className="live-grid">
        <section className="panel">
          <div className="health-large">
            <div
              className="health-ring"
              style={{ "--score": score.overall + "%" } as React.CSSProperties}
            >
              <strong>
                {score.overall}
                <small>TRIP HEALTH</small>
              </strong>
            </div>
            <div>
              <h2>
                {incident
                  ? "Let’s find a way forward."
                  : "A little peace of mind."}
              </h2>
              <p>Make informed adjustments as your day unfolds.</p>
            </div>
          </div>
          <div className="metric-grid">
            {Object.entries(score)
              .filter(([k]) => k !== "overall")
              .map(([k, v]) => (
                <Meter
                  key={k}
                  label={k.charAt(0).toUpperCase() + k.slice(1)}
                  value={v}
                  color="green"
                />
              ))}
          </div>
          <div className="incident-banner">
            <TriangleAlert size={25} />
            <div>
              <b>Something changed?</b>
              <p className="muted">
                A delay, a closure, or an unexpected turn.
              </p>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              setSimulated(false);
              setReport(true);
            }}
          >
            <Sparkles size={17} />
            Fix my trip
          </Button>
          <p className="inline-note">
            Traffic, crowd levels and venue access are estimates. Recovery
            updates your plan after you choose an option.
          </p>
        </section>
        <section className="panel">
          <span className="eyebrow">YOUR NEXT DISCOVERY</span>
          {next ? (
            <>
              <div className="live-next">
                <Photo
                  src={next.image}
                  alt={trip.preferences.destination + " destination photograph"}
                />
                <div>
                  <h3>{next.title}</h3>
                  <p>
                    {next.time} · {next.duration} minutes
                  </p>
                  <Link
                    href={"/map?tripId=" + trip.id + "&day=" + day}
                    className="text-action"
                  >
                    Open route
                    <Navigation size={14} />
                  </Link>
                </div>
              </div>
              <div className="hint">
                <LocateFixed size={20} />
                <div>
                  <b>Arrival check-in</b>
                  <p>{location}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setWatching((x) => !x)}
              >
                <LocateFixed size={15} />
                {watching
                  ? "Stop location updates"
                  : "Enable arrival detection"}
              </Button>
              {state?.demo && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    void mutate(
                      "passport/award",
                      { placeId: next.placeId, method: "Demo arrival" },
                      "Demo arrival stamp unlocked",
                    ).catch(() => {})
                  }
                >
                  Simulate arrival
                </Button>
              )}
            </>
          ) : (
            <Empty
              title="No upcoming stop"
              description="Add an activity from your itinerary."
            />
          )}
          <SectionTitle title="Today’s rhythm" />
          {current.items.map((i) => (
            <div className="overview-day" key={i.id}>
              <span className="muted">{i.time}</span>
              <div>
                <h3>{i.title}</h3>
                <p>
                  {i.completed
                    ? "Completed"
                    : i.duration + " min · " + money(i.cost)}
                </p>
              </div>
              {i.completed && (
                <CheckCircle2 size={17} className="text-green-600" />
              )}
            </div>
          ))}
        </section>
      </div>
      {state?.demo && (
        <div className="simulation-panel">
          <h3>DEMO SCENARIOS</h3>
          <p>Try an interruption to see how the journey adapts.</p>
          <div className="actions">
            <Button variant="secondary" onClick={() => simulate("Heavy rain")}>
              <CloudRain size={15} />
              Simulate rain
            </Button>
            <Button
              variant="secondary"
              onClick={() => simulate("Train delayed")}
            >
              <TrainFront size={15} />
              Simulate delay
            </Button>
            <Button
              variant="secondary"
              onClick={() => simulate("Attraction closed")}
            >
              <MapPin size={15} />
              Simulate closure
            </Button>
          </div>
        </div>
      )}
      <Modal
        open={report}
        onClose={() => setReport(false)}
        title={simulated ? "Try a change of plans." : "Tell us what changed."}
        description={
          simulated
            ? "Demo scenario. Your itinerary changes only when you apply a recovery option."
            : "Choose the issue and affected stop. We’ll compare practical adjustments."
        }
      >
        <SelectField
          label="What happened?"
          value={issue}
          onChange={setIssue}
          options={issues}
        />
        <SelectField
          label="Affected activity"
          value={itemId}
          onChange={setItemId}
          options={current.items.map((i) => ({ label: i.title, value: i.id }))}
        />
        <div className="field">
          <label htmlFor="delay">Expected delay (minutes)</label>
          <input
            id="delay"
            type="number"
            min="0"
            max="720"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
          />
        </div>
        {issue === "Medical requirement" && (
          <div className="hint warning">
            <p>
              For urgent help, call 112. This tool cannot assess medical
              urgency.
            </p>
            <a href="tel:112" className="btn btn-danger">
              Call 112
            </a>
          </div>
        )}
        <Button busy={busy} disabled={!itemId} onClick={() => void preview()}>
          <Sparkles size={16} />
          Find recovery options
        </Button>
      </Modal>
      <Modal
        open={!!options.length && !chosen}
        onClose={() => setOptions([])}
        title="There’s more than one way forward."
        description="Compare the changes. Choose the plan that works for you."
        wide
      >
        <div className="recovery-options">
          {options.map((o) => (
            <div
              className={
                "recovery-option " +
                (o.mode === "Balanced" ? "recommended" : "")
              }
              key={o.id}
            >
              <span className="mode">{o.mode}</span>
              <h3>{o.title}</h3>
              <p>{o.description}</p>
              <div className="recovery-delta">
                <div>
                  <strong>
                    {o.costDelta >= 0 ? "+" : ""}
                    {money(o.costDelta)}
                  </strong>
                  <small>Estimated cost change</small>
                </div>
                <div>
                  <strong>
                    {o.timeDelta >= 0 ? "+" : ""}
                    {o.timeDelta}m
                  </strong>
                  <small>End-of-day change</small>
                </div>
              </div>
              <p>
                Trip health {o.before} → {o.after} · {o.affected} activities
                affected
              </p>
              {o.replacements.map((r, i) => (
                <div className="recovery-change" key={i}>
                  <s>{r.before}</s>
                  <b>{r.after}</b>
                </div>
              ))}
              <Button onClick={() => setChosen(o)}>
                Choose {o.mode.toLowerCase()}
              </Button>
            </div>
          ))}
        </div>
      </Modal>
      <Modal
        open={!!chosen}
        onClose={() => setChosen(null)}
        title={"Apply " + chosen?.mode.toLowerCase() + " recovery?"}
        description="Review the changes before updating your itinerary."
      >
        {chosen && (
          <>
            <p className="muted">
              {chosen.affected} activities affected · {money(chosen.costDelta)}{" "}
              estimated cost change · {chosen.timeDelta} min end-of-day change
            </p>
            <ul className="notes-list">
              {chosen.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <Button busy={busy} onClick={() => void apply()}>
              Apply & update trip
            </Button>
          </>
        )}
      </Modal>
    </>
  );
}
