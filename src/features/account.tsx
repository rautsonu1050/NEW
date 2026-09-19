/**
 * Account Component
 *
 * Handles UI rendering and state management for the account feature.
 */
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  ShieldCheck,
  Phone,
  MapPin,
  Bell,
  Check,
  ArrowRight,
  LogOut,
  LocateFixed,
  LifeBuoy,
  Download,
  Navigation,
  Mail,
  Compass,
  Heart,
  Accessibility,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useYatra } from "../store";
import { api, toggle } from "../lib/utils";
import {
  interests,
  foodOptions,
  transportOptions,
  accessibilityOptions,
  cities,
} from "../data/cities";
import type { Profile, Role } from "../lib/types";
import {
  PageTitle,
  Button,
  LinkButton,
  SelectField,
  Photo,
  CheckOption,
  Modal,
  Empty,
  SourceBadge,
  SectionTitle,
} from "../components/shared";
/** Renders the ProfilePage view. */
export default function ProfilePage() {
  const { state, trip, mutate, setCity } = useYatra();
  const params = useSearchParams();
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [sos, setSos] = useState(params.get("sos") === "1");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  useEffect(() => {
    if (state) setP(state.profile);
  }, [state?.profile]);
  if (!p) return null;
  const field = <K extends keyof Profile>(k: K, value: Profile[K]) =>
    setP({ ...p, [k]: value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await mutate("profile", { profile: p }, "Preferences saved");
      if (cities.some((c) => c.name === p.city)) setCity(p.city);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  const enableNotifications = async (value: boolean) => {
    if (!value) {
      field("notifications", false);
      return;
    }
    if (!("Notification" in window)) {
      toast.error("Browser notifications are unavailable.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") field("notifications", true);
    else
      toast.error(
        "Notification permission was not granted. In-app notifications still work.",
      );
  };
  const locate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is unavailable.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () =>
        toast.error(
          "Location permission is unavailable. Enter your location manually when contacting help.",
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };
  const logout = async () => {
    await api("auth", { action: "logout" });
    window.location.href = "/login";
  };
  return (
    <>
      <PageTitle
        eyebrow="A JOURNEY THAT FEELS LIKE YOU"
        title="Your profile & travel preferences."
        description="The little details that make a journey more comfortable."
        actions={
          <Button variant="secondary" onClick={() => setSos(true)}>
            <LifeBuoy size={16} />
            Help & safety
          </Button>
        }
      />
      <div className="profile-header">
        <span className="avatar">{p.name.slice(0, 1)}</span>
        <div>
          <h2>{p.name}</h2>
          <p>
            {p.email} · {state?.demo ? "Demo account" : state?.role}
          </p>
        </div>
      </div>
      <div className="content-grid">
        <form className="panel form-stack" onSubmit={save}>
          <h2>A little about you</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="profile-name">Full name</label>
              <input
                id="profile-name"
                value={p.name}
                onChange={(e) => field("name", e.target.value)}
                minLength={2}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-email">Contact email</label>
              <input
                id="profile-email"
                type="email"
                value={p.email}
                onChange={(e) => field("email", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-phone">Mobile</label>
              <input
                id="profile-phone"
                type="tel"
                value={p.phone}
                onChange={(e) => field("phone", e.target.value)}
                pattern="[+0-9 ()-]{7,20}"
              />
            </div>
            <SelectField
              label="Current city"
              value={p.city}
              onChange={(v) => field("city", v)}
              options={cities.map((c) => c.name)}
            />
          </div>
          <h2 className="mt-5">Your kind of journey</h2>
          <div className="form-grid">
            <SelectField
              label="Food preference"
              value={p.food}
              onChange={(v) => field("food", v)}
              options={foodOptions}
            />
            <SelectField
              label="Getting around"
              value={p.transport}
              onChange={(v) => field("transport", v)}
              options={transportOptions}
            />
            <SelectField
              label="Travel pace"
              value={p.pace}
              onChange={(v) => field("pace", v)}
              options={["Relaxed", "Balanced", "Fast-paced"]}
            />
            <SelectField
              label="Preferred language"
              value={p.language}
              onChange={(v) => field("language", v)}
              options={["English", "Hindi"]}
            />
          </div>
          <p className="field-heading">A few things you love</p>
          <div className="check-grid">
            {interests.map((x) => (
              <CheckOption
                key={x}
                label={x}
                checked={p.interests.includes(x)}
                onChange={() => field("interests", toggle(p.interests, x))}
              />
            ))}
          </div>
          <p className="field-heading">Travel comfortably</p>
          <div className="check-grid">
            {accessibilityOptions.map((x) => (
              <CheckOption
                key={x}
                label={x}
                checked={p.accessibility.includes(x)}
                onChange={() =>
                  field("accessibility", toggle(p.accessibility, x))
                }
              />
            ))}
          </div>
          <div className="field mt-3">
            <label htmlFor="emergency-contact">Emergency contact</label>
            <input
              id="emergency-contact"
              value={p.emergencyContact}
              onChange={(e) => field("emergencyContact", e.target.value)}
              placeholder="Contact name and phone number"
              maxLength={150}
            />
          </div>
          <div className="flex items-center justify-between gap-4 mt-3">
            <label htmlFor="notification-setting" className="muted">
              Browser notifications
            </label>
            <Switch
              id="notification-setting"
              checked={p.notifications}
              onCheckedChange={(v) => void enableNotifications(v)}
            />
          </div>
          <Button type="submit" busy={busy}>
            Save my preferences
            <Check size={16} />
          </Button>
        </form>
        <aside>
          <div className="panel">
            <div className="mini-icon green">
              <ShieldCheck size={21} />
            </div>
            <h2 className="mt-5">A little peace of mind.</h2>
            <p className="muted mt-3">
              Your emergency contacts and saved trip are close at hand.
            </p>
            <Button
              variant="secondary"
              className="w-full mt-5"
              onClick={() => setSos(true)}
            >
              <LifeBuoy size={15} />
              Open help & safety
            </Button>
            {trip && (
              <Button
                variant="ghost"
                className="w-full mt-3"
                onClick={() => {
                  const text = [
                    trip.title,
                    ...trip.days.flatMap((d) => [
                      "Day " + d.number + " · " + d.date,
                      ...d.items.map(
                        (i) =>
                          i.time +
                          " " +
                          i.title +
                          " · " +
                          i.duration +
                          " min · ₹" +
                          i.cost,
                      ),
                    ]),
                  ].join("\n");
                  const blob = new Blob([text], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "yatra-offline-itinerary.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Itinerary downloaded for offline use");
                }}
              >
                <Download size={15} />
                Download offline itinerary
              </Button>
            )}
            <p className="inline-note">
              Offline text includes your itinerary. Live weather, map tiles and
              online actions require a connection.
            </p>
          </div>
          <div className="panel mt-5">
            <h3>Your account</h3>
            <p className="muted mt-3">
              {state?.demo
                ? "Demo data is saved in an isolated session. Sign-in with email or Google needs the configured authentication service."
                : "Your role is controlled by the server. Editing contact details does not change your sign-in identity."}
            </p>
            <Link href="/onboarding" className="text-action">
              Take a quick tour
              <ArrowRight size={14} />
            </Link>
            <Button
              variant="ghost"
              onClick={() => void logout().catch((e) => toast.error(e.message))}
            >
              <LogOut size={15} />
              Log out
            </Button>
          </div>
        </aside>
      </div>
      <Modal
        open={sos}
        onClose={() => setSos(false)}
        title="Help is one call away."
        description="Use the emergency number if you need urgent assistance."
      >
        <div className="grid-two">
          <a className="btn btn-danger" href="tel:112">
            <Phone size={18} />
            Emergency · 112
          </a>
          <a className="btn btn-secondary" href="tel:1363">
            <Phone size={18} />
            Tourist helpline · 1363
          </a>
        </div>
        <p className="muted">
          Police, fire and medical emergencies: 112. Tourist information and
          assistance: 1363.
        </p>
        <div className="hint">
          <MapPin size={20} />
          <div>
            <b>Your location</b>
            <p>
              {location
                ? location.lat.toFixed(5) + ", " + location.lng.toFixed(5)
                : "Your location has not been requested."}
            </p>
          </div>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={locate}>
            <LocateFixed size={16} />
            Get my location
          </Button>
          {location && (
            <Button
              variant="secondary"
              onClick={() => {
                const url =
                  "https://www.google.com/maps?q=" +
                  location.lat +
                  "," +
                  location.lng;
                if (navigator.share)
                  navigator
                    .share({ title: "My location", url })
                    .catch(() => {});
                else
                  navigator.clipboard
                    .writeText(url)
                    .then(() => toast.success("Location link copied"))
                    .catch(() => toast.error("Clipboard unavailable"));
              }}
            >
              Share location
            </Button>
          )}
        </div>
        <a
          className="text-action"
          href={
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(
              location
                ? "hospital near " + location.lat + "," + location.lng
                : "hospital in " + p.city,
            )
          }
          target="_blank"
          rel="noreferrer"
        >
          Find nearby hospitals
          <Navigation size={15} />
        </a>
        <p className="muted">
          Emergency contact: {p.emergencyContact || "Add one in your profile."}
        </p>
        <p className="inline-note">
          Tapping a number opens your device’s calling app. Your location is
          shared only when you choose to share it.
        </p>
      </Modal>
    </>
  );
}
/** Renders the Notifications view. */
export function Notifications() {
  const { state, mutate } = useYatra();
  const notices = state?.notifications || [];
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE HEADS-UP"
        title="Your journey, kept in the loop."
        description="Updates, bookings, and little milestones along the way."
        actions={
          <Button
            variant="secondary"
            disabled={!notices.some((n) => !n.read)}
            onClick={() =>
              void mutate(
                "notifications",
                { all: true },
                "All notifications marked as read",
              ).catch(() => {})
            }
          >
            <Check size={15} />
            Mark all read
          </Button>
        }
      />
      {notices.length ? (
        notices.map((n) => (
          <article
            className={"notification-row " + (!n.read ? "unread" : "")}
            key={n.id}
          >
            <div
              className={
                "mini-icon " + (n.category === "PASSPORT" ? "green" : "purple")
              }
            >
              <Bell size={18} />
            </div>
            <div>
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <small>{new Date(n.createdAt).toLocaleString("en-IN")}</small>
              {n.href && (
                <Link className="text-action" href={n.href}>
                  View details
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
            {!n.read && (
              <button
                onClick={() =>
                  void mutate("notifications", { id: n.id }).catch(() => {})
                }
              >
                <Check size={14} />
                Mark read
              </button>
            )}
          </article>
        ))
      ) : (
        <Empty
          title="All quiet for now"
          description="Your trip updates and milestones will appear here."
        />
      )}
    </>
  );
}
/** Renders the Auth view. */
export function Auth({
  register = false,
  callback = false,
}: {
  register?: boolean;
  callback?: boolean;
}) {
  const { state, mutate, refresh } = useYatra();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recover, setRecover] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [reset, setReset] = useState(false);
  useEffect(() => {
    if (!callback) return;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const code = url.searchParams.get("code");
    const token = hash.get("access_token");
    if (hash.get("type") === "recovery" && token) {
      setResetToken(token);
      setReset(true);
      window.history.replaceState(null, "", "/auth-return");
      return;
    }
    if (code || token) {
      setBusy(true);
      api<any>(
        "auth",
        code ? { action: "exchange", code } : { action: "token", token },
      )
        .then(async () => {
          window.history.replaceState(null, "", "/auth-return");
          await refresh();
          router.push("/");
        })
        .catch((e) => setMessage(e.message))
        .finally(() => setBusy(false));
    } else setMessage("This sign-in link is incomplete. Please sign in again.");
  }, [callback, refresh, router]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((register || reset) && password !== confirm) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (reset) {
        const r = await api<any>("auth", {
          action: "reset",
          token: resetToken,
          password,
        });
        setMessage(r.message);
        setReset(false);
        setResetToken("");
        return;
      }
      const r = await api<any>("auth", {
        action: register ? "register" : "login",
        name,
        email,
        phone,
        password,
        remember,
      });
      if (r.message) setMessage(r.message);
      else {
        await refresh();
        router.push(
          r.role === "admin"
            ? "/admin"
            : r.role === "business"
              ? "/business"
              : "/",
        );
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const demo = async (role: Role) => {
    setBusy(true);
    try {
      await mutate("role", { role });
      router.push(
        role === "admin"
          ? "/admin"
          : role === "business"
            ? "/business"
            : role === "authority"
              ? "/admin"
              : "/",
      );
    } catch {
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    setBusy(true);
    try {
      const r = await api<{ url: string }>("auth", { action: "google" });
      window.location.assign(r.url);
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="auth-layout">
      <div className="auth-photo">
        <Photo src="/images/jaipur.webp" alt="Jaipur, Rajasthan" eager />
        <div>
          <h2>
            Every great journey
            <br />
            starts with a little curiosity.
          </h2>
          <p>
            Your India. Your pace. A travel companion that brings it all
            together.
          </p>
        </div>
      </div>
      <section className="auth-form">
        <h1>
          {reset
            ? "Choose a new password."
            : register
              ? "A new chapter starts here."
              : "Welcome back, traveler."}
        </h1>
        <p className="muted">
          {register
            ? "Let’s make your next journey personal."
            : reset
              ? "Use at least 8 characters."
              : "Your next story is waiting for you."}
        </p>
        <form onSubmit={submit}>
          {register && (
            <div className="field">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
          )}
          {!reset && (
            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          )}
          {register && (
            <div className="field">
              <label htmlFor="auth-phone">Phone</label>
              <input
                id="auth-phone"
                type="tel"
                pattern="[+0-9 ()-]{7,20}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={
                register || reset ? "new-password" : "current-password"
              }
            />
          </div>
          {(register || reset) && (
            <div className="field">
              <label htmlFor="auth-confirm">Confirm password</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
          )}
          {!register && !reset && (
            <div className="flex justify-between items-center mt-4 gap-3">
              <CheckOption
                label="Remember me"
                checked={remember}
                onChange={() => setRemember((x) => !x)}
              />
              <button
                type="button"
                className="text-action"
                onClick={() => setRecover(true)}
              >
                Forgot password?
              </button>
            </div>
          )}
          <Button type="submit" busy={busy}>
            {reset
              ? "Update password"
              : register
                ? "Create account"
                : "Sign in"}
            <ArrowRight size={16} />
          </Button>
        </form>
        {message && (
          <p role="status" className="inline-note">
            {message}
          </p>
        )}
        {!reset && (
          <>
            <Button
              variant="secondary"
              busy={busy}
              onClick={() => void google()}
            >
              <span className="font-bold text-blue-500">G</span>Continue with
              Google
            </Button>
            <p className="inline-note">
              {state?.authConfigured
                ? "Your account uses the configured authentication service."
                : "Email and Google sign-in need authentication setup. The demo roles below work now."}
            </p>
            <p className="muted">
              {register ? "Already have an account? " : "New here? "}
              <Link
                className="text-purple-500"
                href={register ? "/login" : "/register"}
              >
                {register ? "Sign in" : "Create an account"}
              </Link>
            </p>
            {state?.demo && (
              <>
                <div className="auth-divider">EXPLORE DEMO ROLES</div>
                <div className="demo-roles">
                  {(
                    ["traveler", "business", "admin", "authority"] as Role[]
                  ).map((r) => (
                    <button
                      key={r}
                      disabled={busy}
                      onClick={() => void demo(r)}
                    >
                      {r === "authority"
                        ? "Tourism Authority"
                        : r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        <Modal
          open={recover}
          onClose={() => setRecover(false)}
          title="Find your way back in."
          description="Enter your account email for a password reset link."
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await api<{ message: string }>("auth", {
                  action: "recover",
                  email,
                });
                setMessage(r.message);
                setRecover(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="field">
              <label htmlFor="recover-email">Email</label>
              <input
                id="recover-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" busy={busy}>
              Send reset link
            </Button>
          </form>
        </Modal>
      </section>
    </div>
  );
}
/** Renders the Onboarding view. */
export function Onboarding() {
  const [step, setStep] = useState(0);
  const { mutate } = useYatra();
  const router = useRouter();
  const slides = [
    [
      "Discover India, a little differently.",
      "From familiar favorites to quieter corners, find a journey that feels like yours.",
      "/images/varanasi.webp",
    ],
    [
      "Built around what you love.",
      "Tell us about your interests, budget, food preferences and travel needs. We’ll connect the dots.",
      "/images/jaipur.webp",
    ],
    [
      "Plans that move with you.",
      "When a delay, rain or a closure changes your day, compare practical alternatives and adapt your itinerary.",
      "/images/delhi.webp",
    ],
    [
      "Leave room for the hidden stories.",
      "Support local stays, kitchens and craftspeople. Discover the places that make a destination special.",
      "/images/kerala.webp",
    ],
    [
      "A little care for every traveler.",
      "Set a comfortable pace and accessibility preferences. Confirm essential arrangements with local providers.",
      "/images/rishikesh.webp",
    ],
    [
      "Your journey, beautifully connected.",
      "Keep your plans, budget, bookings and heritage memories together, one day at a time.",
      "/images/udaipur.webp",
    ],
  ];
  const done = () =>
    void mutate("onboarding", {})
      .then(() => router.push("/"))
      .catch(() => {});
  return (
    <section className="onboard">
      <div className="onboard-photo">
        <Photo src={slides[step][2]} alt="Explore India" eager />
      </div>
      <h1>{slides[step][0]}</h1>
      <p>{slides[step][1]}</p>
      <div className="onboard-dots">
        {slides.map((_, i) => (
          <span className={i === step ? "active" : ""} key={i} />
        ))}
      </div>
      <div className="actions">
        <Button variant="ghost" onClick={done}>
          Skip
        </Button>
        <Button
          onClick={() =>
            step === slides.length - 1 ? done() : setStep((x) => x + 1)
          }
        >
          {step === slides.length - 1 ? "Start exploring" : "Next"}
          <ArrowRight size={16} />
        </Button>
      </div>
    </section>
  );
}
