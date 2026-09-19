/**
 * Planner Component
 *
 * Handles UI rendering and state management for the planner feature.
 */
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  MapPin,
  LocateFixed,
  ShieldCheck,
  CalendarDays,
  Users,
  Wallet,
  Heart,
  Utensils,
  TrainFront,
  BedDouble,
  Accessibility,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useYatra } from "../store";
import {
  defaultPreferences,
  cities,
  interests,
  foodOptions,
  transportOptions,
  stayOptions,
  accessibilityOptions,
} from "../data/cities";
import { preferencesSchema } from "../lib/validation";
import { money, addDays, distance, toggle } from "../lib/utils";
import type { Preferences, Trip } from "../lib/types";
import {
  Button,
  CityPicker,
  Photo,
  CheckOption,
  SelectField,
  PageTitle,
} from "../components/shared";
const steps = [
  ["The destination", MapPin],
  ["Dates & company", CalendarDays],
  ["Your budget", Wallet],
  ["What you love", Heart],
  ["Food preferences", Utensils],
  ["Getting around", TrainFront],
  ["Your kind of stay", BedDouble],
  ["Travel comfortably", Accessibility],
  ["One last look", ClipboardCheck],
] as const;
const stepFields: (keyof Preferences)[][] = [
  ["origin", "destination"],
  ["startDate", "endDate", "travelers"],
  ["budget"],
  ["interests"],
  ["food"],
  ["transport"],
  ["stay"],
  ["accessibility"],
  [],
];
/** Renders the Planner view. */
export default function Planner() {
  const params = useSearchParams();
  const router = useRouter();
  const { mutate, state } = useYatra();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [geo, setGeo] = useState("");
  const [failure, setFailure] = useState("");
  const defaults = defaultPreferences();
  const initial = {
    ...defaults,
    ...(state?.profile
      ? {
          food: state.profile.food,
          transport: state.profile.transport,
          interests: state.profile.interests.length
            ? state.profile.interests
            : defaults.interests,
          accessibility: state.profile.accessibility,
        }
      : {}),
    origin: params.get("origin") || defaults.origin,
    destination: params.get("destination") || defaults.destination,
    startDate: params.get("date") || defaults.startDate,
    endDate: params.get("date")
      ? addDays(params.get("date")!, 2)
      : defaults.endDate,
    travelers: Number(params.get("travelers") || defaults.travelers),
  };
  const {
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: initial,
  });
  const p = watch();
  const selectedCity =
    cities.find((c) => c.name === p.destination) || cities[0];
  const next = async () => {
    if (await trigger(stepFields[step])) {
      setStep((x) => Math.min(8, x + 1));
      setFailure("");
    }
  };
  const generate = async (data: Preferences) => {
    if (step !== 8) {
      await next();
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      const t = await mutate<Trip>(
        "trips/generate",
        data,
        "Your journey is ready",
      );
      router.push("/traveler/trips/" + t.id);
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setGeo("Location is not supported by this browser.");
      return;
    }
    setGeo("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = cities.slice().sort(
          (a, b) =>
            distance(a, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }) -
            distance(b, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
        )[0];
        if (
          distance(nearest, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }) <= 80
        ) {
          setValue("origin", nearest.name);
          setGeo("Nearest supported city: " + nearest.name);
        } else {
          setGeo(
            "Your coordinates: " +
              pos.coords.latitude.toFixed(4) +
              ", " +
              pos.coords.longitude.toFixed(4) +
              ". Select your origin city below.",
          );
        }
      },
      () =>
        setGeo(
          "Location permission was unavailable. You can select a city manually.",
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };
  if (busy)
    return (
      <div className="generating">
        <div className="generate-orbit">
          <Sparkles size={42} />
        </div>
        <span className="eyebrow">A LITTLE THOUGHT GOES A LONG WAY</span>
        <h1>
          Connecting the dots
          <br />
          for your {p.destination} journey.
        </h1>
        <p>Your preferences, thoughtful stops, and time to breathe.</p>
        <div className="generation-status">
          <Loader2 size={18} className="spin" />
          Building and validating your itinerary
        </div>
        <ul>
          <li>
            <Check size={16} />
            Preferences captured
          </li>
          <li>
            <Check size={16} />
            Budget and dates validated
          </li>
          <li>
            <Loader2 size={16} className="spin" />
            Preparing routes, activities and reserves
          </li>
        </ul>
      </div>
    );
  return (
    <>
      <PageTitle
        eyebrow="YOUR JOURNEY STARTS WITH YOU"
        title="Let’s make it your kind of trip."
        description="A few thoughtful details. A journey that feels like you."
      />
      <div className="wizard-layout">
        <aside className="wizard-steps">
          {steps.map(([label, Icon], i) => (
            <button
              key={label}
              type="button"
              className={`${step === i ? "active" : ""} ${step > i ? "done" : ""}`}
              disabled={i > step}
              onClick={() => setStep(i)}
            >
              <span>{step > i ? <Check size={17} /> : <Icon size={17} />}</span>
              <div>
                <small>STEP {i + 1}</small>
                {label}
              </div>
            </button>
          ))}
        </aside>
        <form className="wizard-card" onSubmit={handleSubmit(generate)}>
          <div className="wizard-progress">
            <span>
              Step {step + 1} of {steps.length}
            </span>
            <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
          </div>
          <Progress value={((step + 1) / steps.length) * 100} />
          <div className="wizard-step">
            <span className="step-kicker">{steps[step][0]}</span>
            <h2>
              {
                [
                  "Where are we going?",
                  "Make time for a little adventure.",
                  "A budget you feel good about.",
                  "What makes a trip memorable?",
                  "Good food, your way.",
                  "How do you like to get around?",
                  "Find a place that feels right.",
                  "A little care makes a big difference.",
                  "This is beginning to look like you.",
                ][step]
              }
            </h2>
            {step === 0 && (
              <>
                <div className="form-grid">
                  <CityPicker
                    label="Your starting point"
                    origin
                    value={p.origin}
                    onChange={(v) => setValue("origin", v)}
                  />
                  <CityPicker
                    label="Your destination"
                    value={p.destination}
                    onChange={(v) => setValue("destination", v)}
                  />
                </div>
                <button className="text-action" type="button" onClick={locate}>
                  <LocateFixed size={16} />
                  Use my current location
                </button>
                {geo && <p className="inline-note">{geo}</p>}
                <p className="field-heading">A little inspiration</p>
                <div className="city-choices">
                  {cities.slice(0, 6).map((c) => (
                    <button
                      type="button"
                      key={c.name}
                      className={p.destination === c.name ? "selected" : ""}
                      onClick={() => setValue("destination", c.name)}
                    >
                      <Photo src={c.image} alt={c.name} />
                      <span>{c.name}</span>
                      {p.destination === c.name && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="start-date">Departure date</label>
                    <input
                      id="start-date"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      {...register("startDate")}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="end-date">Return date</label>
                    <input
                      id="end-date"
                      type="date"
                      min={p.startDate}
                      {...register("endDate")}
                    />
                  </div>
                </div>
                <div className="choice-row">
                  {[3, 5, 7, 10].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className="choice-chip"
                      onClick={() =>
                        setValue("endDate", addDays(p.startDate, n - 1))
                      }
                    >
                      {n} days
                    </button>
                  ))}
                </div>
                <SelectField
                  label="Who’s coming along?"
                  value={p.group}
                  onChange={(v) => {
                    setValue("group", v);
                    if (v === "Solo") setValue("travelers", 1);
                    if (v === "Couple") setValue("travelers", 2);
                  }}
                  options={["Solo", "Couple", "Family", "Group"]}
                />
                <div className="field">
                  <label htmlFor="travelers">Number of travelers</label>
                  <input
                    id="travelers"
                    type="number"
                    min="1"
                    max="20"
                    {...register("travelers", { valueAsNumber: true })}
                  />
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <p className="muted">
                  Total budget for everyone, including stays, food, transport
                  and activities.
                </p>
                <div className="budget-choice-grid">
                  {[15000, 25000, 50000, 60000, 100000, 150000].map((n) => (
                    <button
                      type="button"
                      className={p.budget === n ? "selected" : ""}
                      key={n}
                      onClick={() => setValue("budget", n)}
                    >
                      {money(n)}
                      {p.budget === n && <Check size={17} />}
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label htmlFor="budget">Or enter your own budget (INR)</label>
                  <input
                    id="budget"
                    type="number"
                    min="1"
                    step="100"
                    {...register("budget", { valueAsNumber: true })}
                  />
                </div>
                <div className="hint green">
                  <ShieldCheck size={20} />
                  <div>
                    <b>A little peace of mind, included.</b>
                    <p>
                      We set aside 12% for emergencies and 8% as a flexible
                      buffer.
                    </p>
                  </div>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="muted">
                  Choose a few things you love. We’ll build the journey around
                  them.
                </p>
                <div className="check-grid">
                  {interests.map((x) => (
                    <CheckOption
                      key={x}
                      label={x}
                      checked={p.interests.includes(x)}
                      onChange={() =>
                        setValue("interests", toggle(p.interests, x))
                      }
                    />
                  ))}
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <div className="option-grid">
                  {foodOptions.map((x) => (
                    <button
                      type="button"
                      key={x}
                      className={p.food === x ? "selected" : ""}
                      onClick={() => setValue("food", x)}
                    >
                      <Utensils size={22} />
                      <span>{x}</span>
                      {p.food === x && <Check size={16} />}
                    </button>
                  ))}
                </div>
                <p className="inline-note">
                  Restaurant data is a starting point. Confirm ingredients and
                  preparation with the kitchen.
                </p>
              </>
            )}
            {step === 5 && (
              <>
                <div className="option-grid">
                  {transportOptions.map((x) => (
                    <button
                      type="button"
                      key={x}
                      className={p.transport === x ? "selected" : ""}
                      onClick={() => setValue("transport", x)}
                    >
                      <TrainFront size={23} />
                      <span>{x}</span>
                      {p.transport === x && <Check size={16} />}
                    </button>
                  ))}
                </div>
                <p className="inline-note">
                  We use your choice to estimate travel time and daily transport
                  costs.
                </p>
              </>
            )}
            {step === 6 && (
              <div className="option-grid">
                {stayOptions.map((x) => (
                  <button
                    type="button"
                    key={x}
                    className={p.stay === x ? "selected" : ""}
                    onClick={() => setValue("stay", x)}
                  >
                    <BedDouble size={23} />
                    <span>{x}</span>
                    {p.stay === x && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
            {step === 7 && (
              <>
                <div className="check-grid">
                  {accessibilityOptions.map((x) => (
                    <CheckOption
                      key={x}
                      label={x}
                      checked={p.accessibility.includes(x)}
                      onChange={() =>
                        setValue("accessibility", toggle(p.accessibility, x))
                      }
                    />
                  ))}
                </div>
                <div className="hint">
                  <Accessibility size={22} />
                  <p>
                    These requests reduce the daily pace and add travel buffers.
                    Access at individual venues must be confirmed before you
                    visit.
                  </p>
                </div>
              </>
            )}
            {step === 8 && (
              <>
                <div className="review-hero">
                  <Photo src={selectedCity.image} alt={selectedCity.name} />
                  <div>
                    <span>{p.origin} →</span>
                    <h3>{p.destination}</h3>
                    <p>
                      {p.startDate} to {p.endDate}
                    </p>
                  </div>
                </div>
                <div className="review-grid">
                  {[
                    ["Travelers", `${p.travelers} · ${p.group}`],
                    ["Total budget", money(p.budget)],
                    ["Interests", p.interests.join(", ")],
                    ["Food", p.food],
                    ["Transport", p.transport],
                    ["Stay", p.stay],
                    [
                      "Accessibility",
                      p.accessibility.join(", ") || "No additional requests",
                    ],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <small>{k}</small>
                      <b>{v}</b>
                    </div>
                  ))}
                </div>
                <div className="field">
                  <label htmlFor="request">Anything else on your mind?</label>
                  <textarea
                    id="request"
                    {...register("request")}
                    rows={3}
                    placeholder="A quiet morning, a special occasion, a must-see place..."
                  />
                </div>
              </>
            )}
            {Object.values(errors).map((e, i) => (
              <p role="alert" className="form-error" key={i}>
                {e.message}
              </p>
            ))}
            {failure && (
              <p className="form-error" role="alert">
                {failure}
              </p>
            )}
          </div>
          <div className="wizard-actions">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={17} />
              Back
            </Button>
            {step < 8 ? (
              <Button onClick={() => void next()}>
                Continue
                <ArrowRight size={17} />
              </Button>
            ) : (
              <Button type="submit">
                <Sparkles size={17} />
                Generate my AI trip
              </Button>
            )}
          </div>
        </form>
        <aside className="wizard-aside">
          <Photo src={selectedCity.image} alt={selectedCity.name} />
          <span>{selectedCity.state}</span>
          <h3>{selectedCity.name}</h3>
          <p>{selectedCity.tagline}</p>
          <div>
            <ShieldCheck size={21} />
            <p>
              Your choices are saved with your trip. You can change the
              itinerary whenever you need.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
