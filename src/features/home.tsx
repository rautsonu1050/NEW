/**
 * Home Component
 *
 * Handles UI rendering and state management for the home feature.
 */
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Users,
  Sparkles,
  MapPin,
  Sun,
  CloudSun,
  CloudRain,
  Wind,
  HeartPulse,
  Headphones,
  ScanLine,
  BookOpen,
  BriefcaseBusiness,
  Coins,
  Compass,
  Leaf,
  Check,
  Navigation,
} from "lucide-react";
import { useYatra } from "../store";
import { cities, defaultPreferences } from "../data/cities";
import { money, dateLabel } from "../lib/utils";
import { health } from "../lib/health";
import {
  Photo,
  CityPicker,
  Button,
  LinkButton,
  SectionTitle,
  PlaceCard,
  SourceBadge,
  SelectField,
} from "../components/shared";
/** Renders the Home view. */
export default function Home() {
  const { state, trip, city, catalog, weather, mutate } = useYatra();
  const router = useRouter();
  const [origin, setOrigin] = useState("Mumbai");
  const [destination, setDestination] = useState("Delhi");
  const defaults = defaultPreferences();
  const [date, setDate] = useState(defaults.startDate);
  const [travelers, setTravelers] = useState("2");
  const [tab, setTab] = useState("For you");
  const first = state?.profile.name.split(" ")[0] || "Rahul";
  const currentCity = cities.find((c) => c.name === city) || cities[0];
  const featured = catalog.places
    .filter((p) =>
      tab === "Hidden gems"
        ? p.hidden
        : tab === "Culture"
          ? p.interests.includes("Culture")
          : true,
    )
    .slice(0, 4);
  const score = trip ? health(trip).overall : 0;
  const spent =
    state?.expenses
      .filter((e) => e.tripId === trip?.id)
      .reduce((n, e) => n + e.amount, 0) || 0;
  const shortcuts = [
    {
      title: "Live Trip Mode",
      description: "A plan that moves with you",
      href: trip
        ? "/traveler/trips/" + trip.id + "/live"
        : "/traveler/trips/new",
      icon: HeartPulse,
      color: "purple",
    },
    {
      title: "Audio Heritage Guide",
      description: "Every place has a story",
      href: "/audio-guide",
      icon: Headphones,
      color: "orange",
    },
    {
      title: "AI Vision Lens",
      description: "Point. Discover. Understand.",
      href: "/visual-lens",
      icon: ScanLine,
      color: "blue",
    },
    {
      title: "Heritage Passport",
      description: "Collect moments, earn stamps",
      href: "/passport",
      icon: BookOpen,
      color: "pink",
    },
    {
      title: "India Travel Toolkit",
      description: "Feel a little more local",
      href: "/travel-toolkit",
      icon: BriefcaseBusiness,
      color: "green",
    },
    {
      title: "Currency & Costs",
      description: "Make every rupee count",
      href: "/currency",
      icon: Coins,
      color: "purple",
    },
  ];
  return (
    <>
      <div className="home-greeting">
        <div>
          <p className="eyebrow">YOUR JOURNEY, BEAUTIFULLY CONNECTED</p>
          <h1>
            Namaste, {first}. <Sun size={27} className="sun-icon" />
          </h1>
          <p>Where will your curiosity take you today?</p>
        </div>
        <div className="greeting-note">
          <span className="mini-icon green">
            <Leaf size={18} />
          </span>
          Go beyond the usual.
        </div>
      </div>
      <div className="home-top-grid">
        <section className="planner-hero">
          <Photo
            src={currentCity.image}
            alt={city + " destination view"}
            eager
          />
          <div className="hero-shade" />
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <Sparkles size={13} /> A JOURNEY THAT’S YOURS
            </span>
            <h2>
              A little wonder.
              <br />A world of possibilities.
            </h2>
            <p>Thoughtfully planned. Beautifully personal.</p>
            <div className="hero-location">
              <MapPin size={14} />
              {city}, India
            </div>
          </div>
          <form
            className="quick-planner"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(
                "/traveler/trips/new?" +
                  new URLSearchParams({ origin, destination, date, travelers }),
              );
            }}
          >
            <div className="quick-fields">
              <CityPicker
                label="FROM"
                origin
                value={origin}
                onChange={setOrigin}
              />
              <CityPicker
                label="TO"
                value={destination}
                onChange={setDestination}
              />
              <div className="field">
                <label htmlFor="home-date">DEPARTURE</label>
                <input
                  id="home-date"
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <SelectField
                label="TRAVELERS"
                value={travelers}
                onChange={setTravelers}
                options={["1", "2", "3", "4", "5", "6"]}
              />
            </div>
            <Button type="submit">
              <Sparkles size={17} />
              Plan my trip with AI
              <ArrowRight size={17} />
            </Button>
          </form>
        </section>
        <aside className="weather-card">
          <div className="weather-top">
            <div>
              <span>THE SKY ABOVE</span>
              <h3>{city}, India</h3>
            </div>
            <CloudSun size={29} />
          </div>
          <div className="weather-now">
            <strong>
              {weather?.temp ?? "--"}
              <sup>°</sup>
            </strong>
            <div>
              {weather?.condition || "Checking the forecast"}
              <span>Make room for a good day.</span>
            </div>
          </div>
          <div className="weather-mini-grid">
            <div>
              <CloudRain size={17} />
              <b>{weather?.rain ?? "--"}%</b>
              <span>Rain chance</span>
            </div>
            <div>
              <Wind size={17} />
              <b>{weather?.wind ?? "--"} km/h</b>
              <span>Wind speed</span>
            </div>
          </div>
          <div className="weather-hours">
            {(weather?.hourly || [])
              .filter((_, i) => i % 2 === 0)
              .slice(0, 4)
              .map((h) => (
                <div key={h.time}>
                  <span>{h.time}</span>
                  {h.rain > 40 ? <CloudRain size={18} /> : <Sun size={18} />}
                  <b>{h.temp}°</b>
                </div>
              ))}
          </div>
          <div className="weather-source">
            {weather && <SourceBadge source={weather.source} compact />}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Weather by Open-Meteo
            </a>
          </div>
        </aside>
      </div>
      <div className="home-body-grid">
        <div>
          <SectionTitle
            title="A few places to fall in love with"
            subtitle="Familiar favorites. Unexpected discoveries."
            href="/explore"
            action="Explore India"
          />
          <div className="filter-pills">
            {["For you", "Culture", "Hidden gems"].map((t) => (
              <button
                key={t}
                className={t === tab ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t === "For you" && <Sparkles size={14} />} {t}
              </button>
            ))}
          </div>
          {featured.length ? (
            <div className="home-places">
              {featured.map((p) => (
                <PlaceCard key={p.id} place={p} />
              ))}
            </div>
          ) : (
            <p className="inline-note">
              No places match this filter in {city}. Try another category.
            </p>
          )}
          <div className="section-spacer" />
          <SectionTitle title="A companion for every part of your trip" />
          <div className="feature-grid">
            {shortcuts.map((s) => (
              <Link className="feature-card" key={s.title} href={s.href}>
                <div className={"feature-icon " + s.color}>
                  <s.icon size={22} />
                </div>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
          <SectionTitle
            title="Find your next chapter"
            subtitle="One country. Countless ways to experience it."
            href="/explore"
          />
          <div className="destination-strip">
            {cities
              .filter((c) => c.name !== city)
              .slice(0, 4)
              .map((c) => (
                <Link
                  href={"/explore?city=" + c.name}
                  className="destination-tile"
                  key={c.name}
                >
                  <Photo src={c.image} alt={c.name} />
                  <div>
                    <h3>{c.name}</h3>
                    <span>{c.state}</span>
                  </div>
                  <ArrowUpRight size={17} />
                </Link>
              ))}
          </div>
        </div>
        <aside className="home-aside">
          {trip ? (
            <>
              <div className="active-trip-card">
                <div className="small-caps">
                  <span className="status-dot" />
                  YOUR UPCOMING JOURNEY
                </div>
                <h2>
                  {trip.preferences.destination}
                  <span>, here you come.</span>
                </h2>
                <p>
                  <CalendarDays size={14} />
                  {dateLabel(trip.preferences.startDate)} -{" "}
                  {dateLabel(trip.preferences.endDate)}
                  <span>·</span>
                  {trip.days.length} days
                </p>
                <div className="trip-mini-stat">
                  <div>
                    <span>Travelers</span>
                    <b>{trip.preferences.travelers} people</b>
                  </div>
                  <div>
                    <span>Trip budget</span>
                    <b>{money(trip.preferences.budget)}</b>
                  </div>
                </div>
                <Link href={"/traveler/trips/" + trip.id + "/itinerary"}>
                  Your itinerary
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="aside-card health-card">
                <div className="section-title">
                  <h3>Your trip, in balance</h3>
                  <HeartPulse size={19} />
                </div>
                <div className="health-display">
                  <div
                    className="health-ring"
                    style={{ "--score": score + "%" } as React.CSSProperties}
                  >
                    <strong>
                      {score}
                      <small>/100</small>
                    </strong>
                  </div>
                  <div>
                    <b>Room to explore</b>
                    <p>Planning score based on your itinerary.</p>
                  </div>
                </div>
                <Link href={"/traveler/trips/" + trip.id + "/live"}>
                  Open Live Trip <ArrowRight size={14} />
                </Link>
              </div>
              <div className="aside-card wallet-card">
                <span className="mini-icon purple">
                  <Coins size={19} />
                </span>
                <p>YOUR TRAVEL WALLET</p>
                <strong>{money(trip.preferences.budget - spent)}</strong>
                <span>remaining from {money(trip.preferences.budget)}</span>
                <div className="wallet-track">
                  <i
                    style={{
                      width:
                        Math.min(100, (spent / trip.preferences.budget) * 100) +
                        "%",
                    }}
                  />
                </div>
                <Link href="/budget">
                  Manage expenses <ArrowRight size={14} />
                </Link>
              </div>
            </>
          ) : (
            <div className="aside-card">
              <Compass size={32} />
              <h3>Your next story is waiting.</h3>
              <p>Plan a trip or explore the sample Delhi journey.</p>
              <Button
                onClick={() => void mutate("trips/sample", {}).catch(() => {})}
              >
                Load sample trip
              </Button>
            </div>
          )}
          <div className="local-note">
            <Leaf size={22} />
            <h3>A little local goes a long way.</h3>
            <p>
              Find family-run stays, local kitchens, and experiences that give
              back.
            </p>
            <Link href="/stays">
              Stay closer to the story
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
