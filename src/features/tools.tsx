/**
 * Tools Component
 *
 * Handles UI rendering and state management for the tools feature.
 */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  Volume2,
  Navigation,
  Languages,
  MapPin,
  Coins,
  Wallet,
  TrainFront,
  ShieldCheck,
  Car,
  LocateFixed,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useYatra } from "../store";
import { speak } from "../lib/browser";
import { api, money, today } from "../lib/utils";
import type { Provenance } from "../lib/types";
import { cities } from "../data/cities";
import {
  PageTitle,
  TabBar,
  Button,
  LinkButton,
  SelectField,
  SourceBadge,
  CheckOption,
  SectionTitle,
  Stat,
  CityPicker,
} from "../components/shared";
const phrases = [
  {
    hindi: "भैया, मीटर से चलेंगे?",
    latin: "Bhaiya, meter se chalenge?",
    meaning: "Will you use the meter?",
    category: "Navigation",
  },
  {
    hindi: "यह बहुत महंगा है, थोड़ा कम करो ना।",
    latin: "Yeh bahut mehenga hai, thoda kam karo na.",
    meaning: "This is quite expensive. Could you lower the price?",
    category: "Bargaining",
  },
  {
    hindi: "क्या यह शुद्ध शाकाहारी है?",
    latin: "Kya yeh shuddh shakahari hai?",
    meaning: "Is this completely vegetarian?",
    category: "Dining",
  },
  {
    hindi: "इसमें ज्यादा मिर्च मत डालना।",
    latin: "Isme zyada mirch mat daalna.",
    meaning: "Please do not make it too spicy.",
    category: "Dining",
  },
  {
    hindi: "मुझे निकटतम मेट्रो स्टेशन जाना है।",
    latin: "Mujhe nikat-tam metro station jaana hai.",
    meaning: "I need to go to the nearest metro station.",
    category: "Navigation",
  },
  {
    hindi: "कृपया मेरी मदद कीजिए।",
    latin: "Kripya meri madad keejiye.",
    meaning: "Please help me.",
    category: "Emergency",
  },
];
/** Renders the Toolkit view. */
export default function Toolkit() {
  const [tab, setTab] = useState("Last-mile & Auto");
  const [from, setFrom] = useState("Connaught Place");
  const [to, setTo] = useState("India Gate");
  const [km, setKm] = useState(4);
  const [night, setNight] = useState(false);
  const [address, setAddress] = useState(
    "Behind Old Shiva Mandir, Opposite Gupta General Store, Gali No. 4, Near AIIMS Gate 2",
  );
  const [parsed, setParsed] = useState<{
    primary: string;
    secondary: string;
    position: string;
    driver: string;
    lane: boolean;
  } | null>(null);
  const [filter, setFilter] = useState("All");
  const fare = Math.round(
    (30 + Math.max(0, km - 1.5) * 11) * (night ? 1.25 : 1),
  );
  const interpret = () => {
    if (address.trim().length < 8) {
      toast.error("Enter an address with a landmark or street.");
      return;
    }
    const parts = address
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const primary = parts.find((x) => /^near /i.test(x)) || parts[0];
    const secondary =
      parts.find((x) => /opposite|opp\.?|behind/i.test(x)) ||
      parts[1] ||
      "No secondary landmark supplied";
    const position = parts
      .filter((x) => /behind|opposite|near|gali|lane/i.test(x))
      .join(" → ");
    setParsed({
      primary,
      secondary,
      position,
      driver:
        "कृपया मुझे " + primary.replace(/^near /i, "") + " के पास छोड़ दीजिए।",
      lane: /gali|lane/i.test(address),
    });
  };
  return (
    <>
      <PageTitle
        eyebrow="FEEL A LITTLE MORE LOCAL"
        title="The India travel toolkit."
        description="Useful words, familiar landmarks, and a little street sense."
      />
      <TabBar
        value={tab}
        onChange={setTab}
        options={[
          "Last-mile & Auto",
          "Address interpreter",
          "Local phrasebook",
          "Currency & Costs",
          "Flights & Rail",
        ]}
      />
      {tab === "Last-mile & Auto" && (
        <div className="grid-two">
          <section className="tool-card">
            <h2>A fair starting point.</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="fare-from">From</label>
                <input
                  id="fare-from"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="fare-to">To</label>
                <input
                  id="fare-to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <div className="field mt-5">
              <label htmlFor="fare-distance">Distance (km)</label>
              <input
                id="fare-distance"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={km}
                onChange={(e) =>
                  setKm(Math.max(0, Math.min(100, Number(e.target.value))))
                }
              />
            </div>
            <div className="mt-5">
              <CheckOption
                label="Night travel · sample 25% supplement"
                checked={night}
                onChange={() => setNight((x) => !x)}
              />
            </div>
            <div className="fare-result">
              <span>SAMPLE METER ESTIMATE · NOT AN OFFICIAL QUOTE</span>
              <strong>{money(fare)}</strong>
              <p>
                {from} → {to} · {km} km
              </p>
              <p>
                Illustrative model: ₹30 for the first 1.5 km, then ₹11 per km.
                Rates vary by city and may change.
              </p>
            </div>
            <div className="review-grid">
              <div>
                <small>SAMPLE NEGOTIATION RANGE</small>
                <b>
                  {money(fare)} - {money(Math.round(fare * 1.3))}
                </b>
              </div>
              <div>
                <small>WAITING TIME</small>
                <b>Confirm with driver</b>
              </div>
            </div>
          </section>
          <aside className="tool-card">
            <div className="mini-icon green">
              <ShieldCheck size={20} />
            </div>
            <h2 className="mt-4">A few things to agree on.</h2>
            <div className="details-copy">
              <section>
                <h3>Before the ride</h3>
                <p>
                  Confirm the full fare, destination, tolls, parking and waiting
                  charges before getting in.
                </p>
              </section>
              <section>
                <h3>Find the right pickup point</h3>
                <p>
                  Use a signed transport stand or the station’s designated
                  pickup area. Check the vehicle and driver details when using a
                  booking app.
                </p>
              </section>
              <section>
                <h3>For the last stretch</h3>
                <p>
                  Narrow lanes may need a short walk. Share your landmark and
                  ask whether the vehicle can reach it before you leave.
                </p>
              </section>
              <section>
                <h3>Traveling with company</h3>
                <p>
                  Confirm the vehicle’s permitted capacity. Use a larger vehicle
                  when your group or luggage needs more space.
                </p>
              </section>
            </div>
            <LinkButton href="/map" secondary>
              Open my route
              <Navigation size={16} />
            </LinkButton>
          </aside>
        </div>
      )}
      {tab === "Address interpreter" && (
        <div className="grid-two">
          <section className="tool-card">
            <h2>A landmark makes all the difference.</h2>
            <div className="field">
              <label htmlFor="address">Paste a local address</label>
              <textarea
                id="address"
                rows={5}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={1000}
              />
            </div>
            <div className="actions mt-5">
              <Button onClick={interpret}>
                <Languages size={16} />
                Interpret address
              </Button>
            </div>
            <p className="inline-note">
              This parser uses the words you provide. It does not verify that a
              landmark exists or that the route is accessible.
            </p>
          </section>
          <section className="tool-card">
            {parsed ? (
              <>
                <span className="source-badge source-demo">
                  Parsed locally · Unverified
                </span>
                <SectionTitle title="A clearer way to say it" />
                <div className="review-grid">
                  <div>
                    <small>PRIMARY LANDMARK</small>
                    <b>{parsed.primary}</b>
                  </div>
                  <div>
                    <small>SECONDARY CUE</small>
                    <b>{parsed.secondary}</b>
                  </div>
                </div>
                <p className="muted">{parsed.position}</p>
                <div className="hint">
                  <p>{parsed.driver}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    try {
                      speak(parsed.driver, "hi-IN");
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Volume2 size={16} />
                  Hear the driver instruction
                </Button>
                <p className="inline-note">
                  {parsed.lane
                    ? "A lane is mentioned. Ask about vehicle access and walking distance."
                    : "Walking distance and vehicle access are unknown."}
                </p>
              </>
            ) : (
              <p className="muted">
                Your address, landmarks and a Hindi driver instruction will
                appear here.
              </p>
            )}
          </section>
        </div>
      )}
      {tab === "Local phrasebook" && (
        <section className="tool-card">
          <div className="flex justify-between gap-5 items-center flex-wrap">
            <h2>Small words. Warmer connections.</h2>
            <SelectField
              label="Situation"
              value={filter}
              onChange={setFilter}
              options={[
                "All",
                "Navigation",
                "Dining",
                "Bargaining",
                "Emergency",
              ]}
            />
          </div>
          {phrases
            .filter((p) => filter === "All" || p.category === filter)
            .map((p) => (
              <article className="phrase-card" key={p.hindi}>
                <div>
                  <span className="source-badge">{p.category}</span>
                  <h3 className="mt-3">{p.hindi}</h3>
                  <p>{p.latin}</p>
                  <small>{p.meaning}</small>
                </div>
                <button
                  aria-label={"Hear " + p.meaning}
                  onClick={() => {
                    try {
                      speak(p.hindi, "hi-IN");
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Volume2 size={20} />
                </button>
              </article>
            ))}
          <p className="inline-note">
            Pronunciation uses your browser’s available Hindi voice.
          </p>
        </section>
      )}
      {tab === "Currency & Costs" && (
        <div className="grid-two">
          <section className="tool-card">
            <Coins size={35} className="text-purple-400" />
            <h2 className="mt-6">A little currency confidence.</h2>
            <p className="muted mb-6">
              Convert common currencies, estimate your trip, and compare sample
              street prices.
            </p>
            <LinkButton href="/currency">
              Open currency tools
              <ArrowRight size={16} />
            </LinkButton>
          </section>
          <section className="tool-card">
            <Wallet size={35} className="text-green-500" />
            <h2 className="mt-6">Keep the whole picture.</h2>
            <p className="muted mb-6">
              Record expenses and keep an eye on your remaining budget and
              emergency reserve.
            </p>
            <LinkButton href="/budget" secondary>
              My travel wallet
              <ArrowRight size={16} />
            </LinkButton>
          </section>
        </div>
      )}
      {tab === "Flights & Rail" && <TransportSearch />}
    </>
  );
}
/** Renders the Currency view. */
export function Currency() {
  const { trip } = useYatra();
  const [tab, setTab] = useState("Converter");
  const [rates, setRates] = useState<{
    data: { rates: Record<string, number>; updated: string };
    source: Provenance;
  } | null>(null);
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [days, setDays] = useState(trip?.days.length || 5);
  const [travelers, setTravelers] = useState(trip?.preferences.travelers || 2);
  const [style, setStyle] = useState("Comfort");
  const [destination, setDestination] = useState(
    trip?.preferences.destination || "Delhi",
  );
  const [markup, setMarkup] = useState(2);
  const [atm, setAtm] = useState(200);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = () => {
    setBusy(true);
    api<any>("currency")
      .then((r) => {
        setRates(r);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);
  const available = [
    "INR",
    "USD",
    "EUR",
    "GBP",
    "AUD",
    "CAD",
    "JPY",
    "SGD",
    "AED",
  ];
  const ratio = (a: string, b: string) =>
    (rates?.data.rates[b] || 1) / (rates?.data.rates[a] || 1);
  const converted = amount * ratio(from, to);
  const daily = (
    {
      Backpacker: 1500,
      Budget: 2500,
      Comfort: 4500,
      Premium: 7500,
      Luxury: 14000,
    } as Record<string, number>
  )[style];
  const factor = ["Mumbai", "Goa"].includes(destination) ? 1.15 : 1;
  const estimated = Math.round(daily * days * travelers * factor);
  const categories = [
    ["Accommodation", 0.4],
    ["Food", 0.2],
    ["Transport", 0.15],
    ["Attractions", 0.1],
    ["Activities & shopping", 0.1],
    ["Miscellaneous", 0.05],
  ] as const;
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE CLARITY GOES A LONG WAY"
        title="Currency & travel costs."
        description="Know what you’re spending, wherever you call home."
        actions={
          <Button variant="secondary" busy={busy} onClick={load}>
            <RefreshCw size={15} />
            Refresh rates
          </Button>
        }
      />
      <TabBar
        value={tab}
        onChange={setTab}
        options={["Converter", "Cost Estimator", "Street Guide"]}
      />
      {rates && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <SourceBadge source={rates.source} />
          <span className="muted">Updated: {rates.data.updated}</span>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      {tab === "Converter" && (
        <div className="grid-two">
          <section className="tool-card">
            <h2>From your currency to theirs.</h2>
            <div className="field">
              <label htmlFor="convert-amount">Amount</label>
              <input
                id="convert-amount"
                type="number"
                min="0"
                max="100000000"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div className="form-grid mt-5">
              <SelectField
                label="From"
                value={from}
                onChange={setFrom}
                options={available}
              />
              <SelectField
                label="To"
                value={to}
                onChange={setTo}
                options={available}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              <ArrowLeftRight size={15} />
              Swap currencies
            </Button>
            <div className="converter-result">
              <span>YOU GET APPROXIMATELY</span>
              <strong>
                {rates
                  ? new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: to,
                      maximumFractionDigits: 2,
                    }).format(converted)
                  : "Checking rates..."}
              </strong>
              <p>
                1 {from} = {rates ? ratio(from, to).toFixed(4) : "--"} {to}
              </p>
            </div>
            <div className="choice-row">
              {[50, 100, 500, 1000].map((n) => (
                <button
                  key={n}
                  className="choice-chip"
                  onClick={() => setAmount(n)}
                >
                  {n} {from}
                </button>
              ))}
            </div>
            <p className="inline-note">
              Indicative mid-market rates. Your bank, exchange counter and
              payment provider may charge different rates and fees.
            </p>
          </section>
          <aside className="tool-card">
            <h2>A quick reference</h2>
            {[10, 50, 100, 500, 1000].map((n) => (
              <div className="expense-row" key={n}>
                <span className="muted">
                  {n} {from}
                </span>
                <ArrowRight size={14} className="ml-auto text-gray-400" />
                <strong>
                  {rates
                    ? (n * ratio(from, to)).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })
                    : "--"}{" "}
                  {to}
                </strong>
              </div>
            ))}
            <p className="inline-note">
              Rates by{" "}
              <a
                href="https://www.exchangerate-api.com/"
                target="_blank"
                rel="noreferrer"
              >
                ExchangeRate-API
              </a>
              . Sample values are clearly labeled if the service is unavailable.
            </p>
          </aside>
        </div>
      )}
      {tab === "Cost Estimator" && (
        <div className="grid-two">
          <section className="tool-card">
            <h2>Make a little room in the budget.</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="estimate-days">Trip days</label>
                <input
                  id="estimate-days"
                  type="number"
                  min="1"
                  max="90"
                  value={days}
                  onChange={(e) =>
                    setDays(Math.min(90, Math.max(1, Number(e.target.value))))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="estimate-travelers">Travelers</label>
                <input
                  id="estimate-travelers"
                  type="number"
                  min="1"
                  max="20"
                  value={travelers}
                  onChange={(e) =>
                    setTravelers(
                      Math.min(20, Math.max(1, Number(e.target.value))),
                    )
                  }
                />
              </div>
            </div>
            <div className="form-grid mt-5">
              <SelectField
                label="Travel style"
                value={style}
                onChange={setStyle}
                options={[
                  "Backpacker",
                  "Budget",
                  "Comfort",
                  "Premium",
                  "Luxury",
                ]}
              />
              <SelectField
                label="Home currency"
                value={from}
                onChange={setFrom}
                options={available}
              />
            </div>
            <div className="mt-5">
              <CityPicker
                label="Destination"
                value={destination}
                onChange={setDestination}
              />
            </div>
            <div className="converter-result">
              <span>SAMPLE LOCAL TRAVEL ESTIMATE</span>
              <strong>{money(estimated)}</strong>
              <p>
                {rates
                  ? (estimated * ratio("INR", from)).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })
                  : "--"}{" "}
                {from} · {days} days · {travelers} people
              </p>
              <p>
                {money(Math.round(estimated / days / travelers))} per person,
                per day
              </p>
            </div>
            <p className="inline-note">
              A rough local-spend model, not a quote. International travel,
              visas, major medical costs and unusual activities are excluded.
            </p>
          </section>
          <aside className="tool-card">
            <h2>How the estimate adds up</h2>
            {categories.map(([name, percent], i) => (
              <div className="expense-row" key={name}>
                <span className="muted">{name}</span>
                <strong className="ml-auto">
                  {money(Math.round(estimated * percent))}
                </strong>
              </div>
            ))}
            <SectionTitle title="Bank fees to allow for" />
            <div className="form-grid">
              <div className="field">
                <label htmlFor="forex-fee">Card markup (%)</label>
                <input
                  id="forex-fee"
                  type="number"
                  min="0"
                  max="20"
                  step=".1"
                  value={markup}
                  onChange={(e) =>
                    setMarkup(Math.max(0, Math.min(20, Number(e.target.value))))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="atm-fee">ATM fee allowance (INR)</label>
                <input
                  id="atm-fee"
                  type="number"
                  min="0"
                  value={atm}
                  onChange={(e) => setAtm(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
            <p className="inline-note">
              If the full estimate is paid by card:{" "}
              {money((estimated * markup) / 100)} markup, plus {money(atm)}{" "}
              entered ATM allowance. These are separate from the travel
              estimate.
            </p>
          </aside>
        </div>
      )}
      {tab === "Street Guide" && (
        <section className="tool-card">
          <h2>Little everyday prices.</h2>
          <p className="muted mb-6">
            Illustrative benchmarks only. Prices vary by city, vendor, portion
            and season.
          </p>
          <div className="grid-three">
            {[
              ["A cup of chai", 20],
              ["A glass of lassi", 80],
              ["A local breakfast", 120],
              ["Bottled water, 1 litre", 20],
              ["A short metro ride", 40],
              ["A casual lunch", 250],
              ["A short auto ride", 80],
              ["A small local craft", 300],
              ["A café coffee", 180],
            ].map(([name, value]) => (
              <div className="stat-card" key={name}>
                <span className="muted">{name}</span>
                <strong>{money(Number(value))}</strong>
                <p>
                  {rates
                    ? (Number(value) * ratio("INR", from)).toFixed(2)
                    : "--"}{" "}
                  {from} · sample
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
function TransportSearch() {
  const { trip } = useYatra();
  const [origin, setOrigin] = useState(trip?.preferences.origin || "Mumbai");
  const [destination, setDestination] = useState(
    trip?.preferences.destination || "Delhi",
  );
  const [date, setDate] = useState(trip?.preferences.startDate || today());
  const [mode, setMode] = useState("Flight");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{
    data: any[];
    source: Provenance;
  } | null>(null);
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setResults(
        await api("travel/search", {
          origin,
          destination,
          date,
          mode,
          travelers: trip?.preferences.travelers || 1,
        }),
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="tool-card">
      <h2>Connect the longer parts of your journey.</h2>
      <form onSubmit={search} className="form-stack">
        <div className="form-grid">
          <CityPicker label="From" origin value={origin} onChange={setOrigin} />
          <CityPicker
            label="To"
            value={destination}
            onChange={setDestination}
          />
        </div>
        <div className="form-grid">
          <SelectField
            label="Transport"
            value={mode}
            onChange={setMode}
            options={["Flight", "Rail"]}
          />
          <div className="field">
            <label htmlFor="transport-date">Departure date</label>
            <input
              type="date"
              id="transport-date"
              value={date}
              min={today()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" busy={busy}>
          <Search size={16} />
          Search transport
        </Button>
      </form>
      {results && (
        <>
          <div className="mt-6">
            <SourceBadge source={results.source} />
          </div>
          <p className="inline-note">{results.source.message}</p>
          {results.data.map((r, i) => (
            <div className="expense-row" key={i}>
              <div className="mini-icon blue">
                <TrainFront size={18} />
              </div>
              <div>
                <h3>{r.carrier || r.name}</h3>
                <p>
                  {r.origin} → {r.destination} · {r.departure} · {r.duration}
                </p>
              </div>
              <strong>{money(r.price)}</strong>
            </div>
          ))}
          {!results.data.length && (
            <p className="muted mt-5">No options returned for this route.</p>
          )}
        </>
      )}
      <p className="inline-note">
        Transport booking and ticket changes are handled by the transport
        provider.
      </p>
      {mode === "Rail" && (
        <a
          href="https://www.irctc.co.in/"
          target="_blank"
          rel="noreferrer"
          className="text-action"
        >
          Open IRCTC
          <ArrowRight size={14} />
        </a>
      )}
    </section>
  );
}
