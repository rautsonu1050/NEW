/**
 * Explore Component
 *
 * Handles UI rendering and state management for the explore feature.
 */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Search,
  Star,
  ArrowRight,
  ArrowLeft,
  Clock,
  Ticket,
  Heart,
  Share2,
  Navigation,
  Plus,
  Sparkles,
  Accessibility,
  Utensils,
  Leaf,
} from "lucide-react";
import { toast } from "sonner";
import { useYatra } from "../store";
import type { Place } from "../lib/types";
import { distance, api, money } from "../lib/utils";
import { cities } from "../data/cities";
import {
  PageTitle,
  PlaceCard,
  CityPicker,
  TabBar,
  Button,
  LinkButton,
  Photo,
  Empty,
  SelectField,
  Modal,
  Loading,
  SourceBadge,
  SectionTitle,
} from "../components/shared";
const categories = [
  "Attractions",
  "Food",
  "Stays",
  "Experiences",
  "Hidden Gems",
];
/** Renders the Explore view. */
export default function Explore() {
  const params = useSearchParams();
  const { city, setCity, catalog, state, mutate } = useYatra();
  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState(
    params.get("category") || "Attractions",
  );
  const [limit, setLimit] = useState(12);
  useEffect(() => {
    if (params.get("city")) setCity(params.get("city")!);
    if (params.get("q")) setQuery(params.get("q")!);
  }, [params, setCity]);
  const contains = (x: string) => x.toLowerCase().includes(query.toLowerCase());
  const places = catalog.places.filter(
    (p) =>
      contains(p.name + " " + p.category + " " + p.city) &&
      (category !== "Hidden Gems" || p.hidden),
  );
  return (
    <>
      <PageTitle
        eyebrow="FOLLOW YOUR CURIOSITY"
        title={"A little more " + city + "."}
        description="Good food, quiet corners, and places you’ll remember."
        actions={
          <LinkButton href="/stays" secondary>
            Find a stay
            <ArrowRight size={15} />
          </LinkButton>
        }
      />
      <div className="explore-controls">
        <div className="full-search">
          <Search size={19} />
          <input
            aria-label="Search places, food, and experiences"
            placeholder="Search places, food, experiences..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(12);
            }}
          />
        </div>
        <CityPicker label="DESTINATION" value={city} onChange={setCity} />
      </div>
      <TabBar
        value={category}
        onChange={(v) => {
          setCategory(v);
          setLimit(12);
        }}
        options={categories}
      />
      <p className="inline-note">
        Demo catalog · Prices, ratings, opening hours and access details need
        confirmation. Photographs show the destination.
      </p>
      {["Attractions", "Hidden Gems"].includes(category) &&
        (places.length ? (
          <>
            <div className="catalog-grid">
              {places.slice(0, limit).map((p) => (
                <PlaceCard key={p.id} place={p} />
              ))}
            </div>
            {places.length > limit && (
              <div className="actions mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setLimit((n) => n + 12)}
                >
                  Show more places
                </Button>
              </div>
            )}
          </>
        ) : (
          <Empty
            title="A different kind of discovery?"
            description="Try another search, category, or destination."
          />
        ))}
      {category === "Stays" && (
        <>
          <div className="catalog-grid">
            {catalog.stays
              .filter((s) => contains(s.name + " " + s.type))
              .map((s) => (
                <article className="trip-list-card" key={s.id}>
                  <Photo src={s.image} alt={city + " destination photograph"} />
                  <div>
                    <small className="muted">
                      {s.type} · {s.rating} sample rating
                    </small>
                    <h2>{s.name}</h2>
                    <p>{money(s.price)} per room, per night</p>
                    <LinkButton
                      href={"/stays?city=" + city + "&stay=" + s.id}
                      secondary
                    >
                      View stay
                      <ArrowRight size={15} />
                    </LinkButton>
                  </div>
                </article>
              ))}
          </div>
          {!catalog.stays.length && (
            <Empty
              title="No stays in this catalog"
              description="Choose another destination to explore the available demo stays."
            />
          )}
        </>
      )}
      {category === "Food" && (
        <>
          <div className="catalog-grid">
            {catalog.restaurants
              .filter((r) => contains(r.name + " " + r.cuisine))
              .map((r) => (
                <article className="trip-list-card" key={r.id}>
                  {r.image ? (
                    <Photo src={r.image} alt={r.name + " " + r.cuisine} />
                  ) : (
                    <div className="mini-icon orange">
                      <Utensils size={18} />
                    </div>
                  )}
                  <div>
                    <h2 className={r.image ? "" : "mt-4"}>{r.name}</h2>
                    <p className="muted mt-2">
                      {r.cuisine} · {r.location}
                    </p>
                    <div className="amenities">
                      {[
                        r.pureVeg
                          ? "Pure vegetarian"
                          : r.veg
                            ? "Vegetarian options"
                            : "Mixed menu",
                        r.jain ? "Jain options" : "Confirm dietary needs",
                        r.dish,
                      ].map((x) => (
                        <span key={x}>{x}</span>
                      ))}
                    </div>
                    <p className="muted">{money(r.price)} per person · sample</p>
                    <p className="inline-note">{r.hours}</p>
                    <div className="actions mt-2">
                      <a
                        className="btn btn-secondary"
                        href={
                          "https://www.google.com/maps/search/?api=1&query=" +
                          encodeURIComponent(r.name + " " + city)
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Find on map
                        <Navigation size={15} />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
          </div>
          {!catalog.restaurants.length && (
            <Empty
              title="Find your next good meal"
              description="There are no named restaurants in this local catalog yet. Your trip still includes dietary-aware meal breaks."
            />
          )}
        </>
      )}
      {category === "Experiences" && (
        <>
          <div className="catalog-grid">
            {catalog.experiences
              .filter((x) => contains(x.title + " " + x.category))
              .map((x) => (
                <article className="trip-list-card" key={x.id}>
                  <Photo src={x.image} alt={city + " destination photograph"} />
                  <div>
                    <small className="muted">
                      {x.category} · {x.duration}
                    </small>
                    <h2>{x.title}</h2>
                    <p>{x.description}</p>
                    <p className="mt-3">Hosted by {x.host} · sample</p>
                    <div className="actions">
                      <LinkButton
                        href={"/stays?experience=" + x.id + "&city=" + city}
                      >
                        Explore & book · {money(x.price)}
                      </LinkButton>
                    </div>
                  </div>
                </article>
              ))}
          </div>
          {!catalog.experiences.length && (
            <Empty
              title="Make your own discovery"
              description="This destination does not yet have bookable experiences in the demo catalog."
            />
          )}
        </>
      )}
      {state?.offers.some((o) => o.active) && (
        <>
          <SectionTitle
            title="A little local hospitality"
            subtitle="Offers from partners in your demo workspace."
          />
          <div className="grid-two">
            {(() => {
              const cityData = cities.find((c) => c.name.toLowerCase() === city.toLowerCase());
              return state.offers
                .filter((o) => o.active)
                .map((o) => {
                  const d = cityData && o.lat && o.lng ? distance(cityData, { lat: o.lat, lng: o.lng }) : null;
                  return { ...o, _distance: d };
                })
                .sort((a, b) => (a._distance || 0) - (b._distance || 0))
                .map((o) => (
                  <article className="offer-card" key={o.id}>
                    {o.image && <Photo src={o.image} alt={o.title} eager={false} />}
                    <div className="offer-discount">
                      {o.discount}%<small>OFF · DEMO</small>
                    </div>
                    <div>
                      <h3>{o.title}</h3>
                      <p>{o.description}</p>
                      <p className="mt-2 text-sm">
                        <strong>Food:</strong> {o.food} <br />
                        <strong>Location:</strong> {o.location} {o._distance !== null ? `(${o._distance} km away)` : ""} <br />
                        <strong>Price:</strong> {money(o.price || 0)}
                      </p>
                      <p className="mt-2">
                        {o.timeWindow} · {o.target}
                      </p>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void mutate(
                          "business/interest",
                          { id: o.id },
                          "Interest saved. Contact the business to confirm the offer.",
                        ).catch(() => {})
                      }
                    >
                      I’m interested
                      <Heart size={15} />
                    </Button>
                  </div>
                </article>
              ));
            })()}
          </div>
        </>
      )}
    </>
  );
}
/** Renders the PlaceDetails view. */
export function PlaceDetails({ id }: { id: string }) {
  const { state, trip, mutate, weather } = useYatra();
  const [place, setPlace] = useState<Place | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState("1");
  const router = useRouter();
  useEffect(() => {
    api<Place>("place?id=" + encodeURIComponent(id))
      .then(setPlace)
      .catch((e) => setError(e.message));
  }, [id]);
  if (error)
    return (
      <Empty
        title="Place unavailable"
        description={error}
        href="/explore"
        action="Back to Explore"
      />
    );
  if (!place) return <Loading />;
  const saved = state?.favorites.includes(place.id);
  const add = async () => {
    if (!trip) {
      router.push("/traveler/trips/new?destination=" + place.city);
      return;
    }
    try {
      await mutate(
        "trips/update",
        {
          tripId: trip.id,
          version: trip.version,
          day: Number(day),
          action: "add",
          placeId: place.id,
        },
        "Added to your itinerary",
      );
      setAdding(false);
    } catch {}
  };
  return (
    <>
      <Link href="/explore" className="text-action">
        <ArrowLeft size={15} />
        Back to Explore
      </Link>
      <div className="detail-hero">
        <Photo
          src={place.image}
          alt={place.city + " destination photograph"}
          eager
        />
        <small>Destination photograph · {place.city}</small>
        <div>
          <span className="hero-eyebrow">{place.category}</span>
          <h1>{place.name}</h1>
          <p>{place.address}</p>
        </div>
      </div>
      <div className="detail-metrics">
        {[
          [Star, "Sample rating", place.rating + " · " + place.reviews],
          [Clock, "Opening hours", place.hours],
          [
            Ticket,
            "Sample entry",
            place.cost ? money(place.cost) : "Free entry",
          ],
          [MapPin, "Time to explore", place.duration + " minutes"],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Star;
          return (
            <div key={String(label)}>
              <I size={19} />
              <small>{String(label)}</small>
              <b>{String(value)}</b>
            </div>
          );
        })}
      </div>
      <div className="content-grid">
        <div className="panel details-copy">
          <section>
            <h2>A place with a story</h2>
            <p>{place.overview}</p>
            <p>{place.description}</p>
          </section>
          <section>
            <h2>A good time to go</h2>
            <p>
              Allow {place.duration} minutes. Confirm the opening hours and any
              closures before leaving. Early visits often leave more flexibility
              in your day.
            </p>
          </section>
          <section>
            <h2>Why it fits your journey</h2>
            <p>
              Explore your interest in{" "}
              {place.interests.join(", ").toLowerCase()}.
              {place.hidden
                ? " This quieter stop brings a different perspective on the city."
                : ""}
            </p>
          </section>
          <section>
            <h2>Travel comfortably</h2>
            <p>{place.accessibility}</p>
          </section>
        </div>
        <aside className="panel">
          <div className="mini-icon purple">
            <Sparkles size={20} />
          </div>
          <h2 className="mt-4">Make it part of your story.</h2>
          <p className="muted mt-3">
            Add this place to your day, or open directions when you’re ready.
          </p>
          <div className="form-stack mt-5">
            <Button
              onClick={() =>
                trip
                  ? setAdding(true)
                  : router.push("/traveler/trips/new?destination=" + place.city)
              }
            >
              <Plus size={16} />
              Add to itinerary
            </Button>
            <a
              className="btn btn-secondary"
              target="_blank"
              rel="noreferrer"
              href={
                "https://www.google.com/maps/dir/?api=1&destination=" +
                place.lat +
                "," +
                place.lng
              }
            >
              <Navigation size={16} />
              Navigate
            </a>
            <Button
              variant="ghost"
              onClick={() =>
                void mutate("favorites", { id: place.id }).catch(() => {})
              }
            >
              <Heart size={16} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved to favorites" : "Save for later"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const url = window.location.href;
                if (navigator.share)
                  navigator.share({ title: place.name, url }).catch(() => {});
                else
                  navigator.clipboard
                    .writeText(url)
                    .then(() => toast.success("Link copied"))
                    .catch(() =>
                      toast.error("Copy the address from your browser."),
                    );
              }}
            >
              <Share2 size={16} />
              Share this place
            </Button>
          </div>
          <p className="inline-note">{place.source}</p>
        </aside>
      </div>
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="A new stop in your journey"
        description={
          trip?.preferences.destination === place.city
            ? "Choose a day. We’ll check whether it fits."
            : "Your active trip is in another destination."
        }
      >
        {trip?.preferences.destination === place.city ? (
          <>
            <SelectField
              label="Add to day"
              value={day}
              onChange={setDay}
              options={trip.days.map((d) => ({
                label: "Day " + d.number + " · " + d.title,
                value: String(d.number),
              }))}
            />
            <Button onClick={() => void add()}>
              Add {place.name.split(" (")[0]}
            </Button>
          </>
        ) : (
          <LinkButton href={"/traveler/trips/new?destination=" + place.city}>
            Plan a {place.city} trip
          </LinkButton>
        )}
      </Modal>
    </>
  );
}
