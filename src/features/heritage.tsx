/**
 * Heritage Component
 *
 * Handles UI rendering and state management for the heritage feature.
 */
"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Headphones,
  Camera,
  BookOpen,
  MapPin,
  Sparkles,
  Award,
  ShieldCheck,
  Leaf,
  ArrowRight,
  Upload,
  ScanLine,
  StopCircle,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useYatra } from "../store";
import { api } from "../lib/utils";
import type { Place, Provenance } from "../lib/types";
import {
  PageTitle,
  Photo,
  SelectField,
  Button,
  LinkButton,
  TabBar,
  Empty,
  SourceBadge,
  Meter,
  Modal,
} from "../components/shared";
/** Renders the AudioGuide view. */
export default function AudioGuide() {
  const { catalog, city, mutate } = useYatra();
  const params = useSearchParams();
  const [place, setPlace] = useState<Place | null>(null);
  const [tab, setTab] = useState("Story");
  const [language, setLanguage] = useState("English");
  const [story, setStory] = useState("");
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [choice, setChoice] = useState("");
  const [awarded, setAwarded] = useState(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const initialized = useRef(false);
  useEffect(() => {
    const selected =
      catalog.places.find((p) => p.id === params.get("placeId")) ||
      catalog.places[0];
    if (selected) {
      setPlace(selected);
      setStory(selected.overview + " " + selected.description);
      setPosition(0);
      setPlaying(false);
      setChoice("");
      setAwarded(false);
      setLanguage("English");
    }
  }, [catalog, params]);
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    },
    [],
  );
  useEffect(() => {
    if (!place) return;
    api<{ position: number; language: string } | null>(
      "audio/progress?placeId=" + place.id,
    )
      .then((p) => {
        if (p) setPosition(p.position);
      })
      .catch(() => {});
  }, [place?.id]);
  if (!place)
    return (
      <Empty
        title="Choose a place with a story"
        description="Explore a supported destination to hear its heritage."
        href="/explore"
        action="Explore places"
      />
    );
  const p = place;
  const play = (at = position) => {
    if (!("speechSynthesis" in window)) {
      toast.error(
        "This browser does not support audio narration. You can read the transcript.",
      );
      return;
    }
    speechSynthesis.cancel();
    const text = story.slice(at);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language === "Hindi" ? "hi-IN" : "en-IN";
    u.rate = 0.9;
    u.onboundary = (e) => {
      if (e.name === "word") setPosition(at + e.charIndex);
    };
    u.onend = () => {
      setPlaying(false);
      setPosition(story.length);
      void api("audio/progress", {
        placeId: p.id,
        position: story.length,
        language,
      }).catch(() => {});
    };
    u.onerror = () => setPlaying(false);
    utterance.current = u;
    speechSynthesis.speak(u);
    setPlaying(true);
  };
  const pause = () => {
    speechSynthesis.cancel();
    setPlaying(false);
    void api("audio/progress", { placeId: p.id, position, language }).catch(
      () => {},
    );
  };
  const skip = (delta: number) => {
    const next = Math.max(0, Math.min(story.length - 1, position + delta));
    setPosition(next);
    if (playing) play(next);
  };
  const changeLanguage = async (lang: string) => {
    pause();
    if (lang === "English") {
      setLanguage(lang);
      setStory(p.overview + " " + p.description);
      setPosition(0);
      return;
    }
    try {
      const r = await api<{ story: string }>("audio/translate", {
        placeId: p.id,
        language: lang,
      });
      setLanguage(lang);
      setStory(r.story);
      setPosition(0);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const answer = async () => {
    if (choice !== p.category) {
      toast.error("Try again. Look at the landmark’s category above.");
      return;
    }
    try {
      await mutate(
        "passport/award",
        { placeId: p.id, method: "Trivia", answer: choice },
        "Heritage stamp unlocked",
      );
      setAwarded(true);
    } catch {}
  };
  const options = Array.from(
    new Set([
      p.category,
      "Modern sports arena",
      "Industrial transport hub",
      "Contemporary office tower",
    ]),
  );
  return (
    <>
      <PageTitle
        eyebrow="EVERY PLACE HAS A STORY"
        title="A voice from the past."
        description="Slow down, listen closely, and discover a little more."
      />
      <div className="audio-layout">
        <aside>
          <div className="audio-cover">
            <Photo src={p.image} alt={p.city + " destination photograph"} />
            <div>
              <Headphones size={24} />
              <h2>{p.name}</h2>
              <p>Heritage story · Browser narration</p>
            </div>
          </div>
          <div className="audio-controls">
            <button
              aria-label="Rewind approximately 15 seconds"
              onClick={() => skip(-180)}
            >
              <RotateCcw size={21} />
            </button>
            <button
              className="play"
              aria-label={playing ? "Pause story" : "Play story"}
              onClick={() =>
                playing
                  ? pause()
                  : play(position >= story.length ? 0 : position)
              }
            >
              {playing ? <Pause size={23} /> : <Play size={23} />}
            </button>
            <button
              aria-label="Forward approximately 15 seconds"
              onClick={() => skip(180)}
            >
              <RotateCw size={21} />
            </button>
          </div>
          <Meter
            label="Story progress"
            value={Math.round((position / Math.max(1, story.length)) * 100)}
          />
          <div className="form-stack">
            <SelectField
              label="Landmark"
              value={p.id}
              onChange={(v) => {
                pause();
                const found = catalog.places.find((x) => x.id === v);
                if (found) {
                  setPlace(found);
                  setStory(found.overview + " " + found.description);
                  setPosition(0);
                  setChoice("");
                  setLanguage("English");
                  setAwarded(false);
                }
              }}
              options={catalog.places.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
            />
            <SelectField
              label="Narration language"
              value={language}
              onChange={(v) => void changeLanguage(v)}
              options={["English", "Hindi"]}
            />
          </div>
          <p className="inline-note">
            Skip buttons move approximately 15 seconds of text. Narration speed
            depends on the available browser voice.
          </p>
        </aside>
        <section className="panel">
          <TabBar
            value={tab}
            onChange={setTab}
            options={["Story", "Trivia", "Photo Spot"]}
          />
          {tab === "Story" && (
            <>
              <span className="source-badge source-demo">
                Android heritage catalog
              </span>
              <h2 className="mt-6 mb-5">{p.name}</h2>
              <p className="transcript">{story}</p>
              <div className="hint">
                <BookOpen size={20} />
                <p>
                  Read alongside the narration. The story comes from the
                  project’s supplied destination notes.
                </p>
              </div>
            </>
          )}
          {tab === "Trivia" && (
            <>
              <span className="source-badge">+150 XP · Once per landmark</span>
              <h2 className="mt-6">What kind of place is this?</h2>
              <p className="muted mt-3">
                {p.name} · {p.category}
              </p>
              {options.map((o) => (
                <button
                  key={o}
                  className={"quiz-option " + (choice === o ? "selected" : "")}
                  onClick={() => setChoice(o)}
                >
                  {choice === o ? <Check size={17} /> : <span>○</span>}
                  {o}
                </button>
              ))}
              <Button
                disabled={!choice || awarded}
                onClick={() => void answer()}
              >
                {awarded ? "Stamp unlocked" : "Check answer & collect stamp"}
              </Button>
            </>
          )}
          {tab === "Photo Spot" && (
            <>
              <Camera size={30} className="text-purple-300" />
              <h2 className="mt-5">A different perspective.</h2>
              <p className="transcript mt-4">
                Look for a public viewpoint that leaves room for other visitors.
                Try the main architectural lines, reflections, and small
                details. Early or late light often creates a gentler photograph.
              </p>
              <div className="hint">
                <ShieldCheck size={20} />
                <p>
                  Check photography rules, avoid restricted areas, and ask
                  permission before photographing people.
                </p>
              </div>
              <a
                href={
                  "https://www.google.com/maps/search/?api=1&query=" +
                  encodeURIComponent(p.name + " " + p.city)
                }
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Explore the location
                <MapPin size={15} />
              </a>
            </>
          )}
        </section>
      </div>
    </>
  );
}
/** Renders the Passport view. */
export function Passport() {
  const { state, catalog, mutate } = useYatra();
  const [tab, setTab] = useState("Stamps");
  const stamps = state?.stamps || [];
  const xp = stamps.reduce((n, s) => n + s.xp, 0);
  const level = Math.floor(xp / 1000) + 1;
  const badgeData = [
    ["Heritage Explorer", stamps.length >= 3, "Collect 3 heritage stamps"],
    [
      "Hidden India Explorer",
      stamps.some((s) =>
        catalog.places.some((p) => p.id === s.placeId && p.hidden),
      ),
      "Visit a hidden gem",
    ],
    [
      "Story Collector",
      stamps.filter((s) => s.method === "Trivia").length >= 2,
      "Complete 2 heritage quizzes",
    ],
    ["Frequent Explorer", stamps.length >= 5, "Collect 5 stamps"],
  ];
  return (
    <>
      <PageTitle
        eyebrow="COLLECT MOMENTS, NOT JUST MILES"
        title="Your heritage passport."
        description="A little record of the places that become part of you."
      />
      <div className="passport-layout">
        <aside>
          <div className="passport-book">
            <div className="passport-brand">YATRA AI</div>
            <BookOpen size={57} strokeWidth={1} />
            <h2>
              EXPLORER
              <br />
              PASSPORT
            </h2>
            <p>A JOURNEY THROUGH INDIA</p>
            <small>PASSPORT HOLDER</small>
            <strong>{state?.profile.name}</strong>
            <small>
              {stamps.length} STAMPS · EXPLORER LEVEL {level}
            </small>
          </div>
          <section className="panel mt-7">
            <h3>Your next chapter</h3>
            <Meter
              label={xp + " XP · Level " + level}
              value={(xp % 1000) / 10}
            />
            <p className="inline-note">
              {1000 - (xp % 1000)} XP to your next explorer level.
            </p>
          </section>
        </aside>
        <section>
          <TabBar
            value={tab}
            onChange={setTab}
            options={["Stamps", "Badges", "Rewards"]}
          />
          {tab === "Stamps" &&
            (stamps.length ? (
              <div className="stamp-grid">
                {stamps.map((s) => (
                  <article className="stamp-card" key={s.id}>
                    <div className="stamp-mark">
                      <MapPin size={31} strokeWidth={1.3} />
                    </div>
                    <h3>{s.name}</h3>
                    <p>
                      {s.city} · {s.date}
                    </p>
                    <span>
                      +{s.xp} XP · {s.simulated ? "Demo arrival" : s.method}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="Your first stamp is waiting."
                description="Check in at a supported attraction or finish its heritage trivia to start your collection."
                href="/audio-guide"
                action="Discover a story"
              />
            ))}
          {tab === "Badges" && (
            <div className="badge-grid">
              {badgeData.map(([name, unlocked, description]) => (
                <article className="achievement-card" key={String(name)}>
                  <Award size={36} />
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <span
                    className={
                      "status-badge mt-4 " + (unlocked ? "" : "pending")
                    }
                  >
                    {unlocked ? "Unlocked" : "In progress"}
                  </span>
                </article>
              ))}
            </div>
          )}
          {tab === "Rewards" && (
            <section className="panel">
              <h2>A little thank-you for your curiosity.</h2>
              <p className="muted mt-4">
                Rewards below are demonstrations. They cannot be redeemed with
                real merchants.
              </p>
              {[
                ["Local discovery coupon", 3, "YATRA-DEMO-LOCAL"],
                ["Heritage explorer reward", 5, "YATRA-DEMO-HERITAGE"],
              ].map(([name, needed, code]) => (
                <div className="offer-card mt-5" key={name}>
                  <div className="offer-discount">
                    <Award size={28} />
                    <small>DEMO</small>
                  </div>
                  <div>
                    <h3>{name}</h3>
                    <p>Collect {needed} stamps to unlock this sample reward.</p>
                    <Button
                      variant="secondary"
                      disabled={stamps.length < Number(needed)}
                      onClick={() =>
                        navigator.clipboard
                          .writeText(String(code))
                          .then(() => toast.success("Demo reward code copied"))
                          .catch(() =>
                            toast.error("Clipboard access unavailable"),
                          )
                      }
                    >
                      <Copy size={14} />
                      {stamps.length >= Number(needed)
                        ? code
                        : "Keep exploring"}
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}
          {state?.demo && catalog.places[0] && (
            <div className="simulation-panel">
              <h3>TRY A DEMO STAMP</h3>
              <p>
                Simulate arrival at {catalog.places[0].name}. Demo stamps are
                labeled in your passport.
              </p>
              <Button
                variant="secondary"
                onClick={() =>
                  void mutate(
                    "passport/award",
                    { placeId: catalog.places[0].id, method: "Demo arrival" },
                    "Demo stamp added",
                  ).catch(() => {})
                }
              >
                Simulate passport unlock
              </Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
/** Renders the Vision view. */
export function Vision() {
  const [mode, setMode] = useState("Monument");
  const [image, setImage] = useState("");
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  };
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const openCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera capture is unavailable. Upload an image instead.",
        );
      stop();
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      stream.current = s;
      setCamera(true);
      setResult(null);
      setTimeout(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => {});
        }
      }, 50);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const capture = () => {
    if (!video.current?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / video.current.videoWidth);
    canvas.width = video.current.videoWidth * scale;
    canvas.height = video.current.videoHeight * scale;
    canvas
      .getContext("2d")!
      .drawImage(video.current, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL("image/jpeg", 0.85));
    setResult(null);
    stop();
  };
  const upload = (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use JPG, PNG or WebP.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Choose an image under 4 MB.");
      return;
    }
    stop();
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setResult(null);
    };
    reader.readAsDataURL(file);
  };
  const analyze = async () => {
    setBusy(true);
    try {
      setResult(await api("vision", { mode, image }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE CURIOSITY. A NEW PERSPECTIVE."
        title="Point. Discover. Understand."
        description="Explore monuments, food, craft, and signs with YATRA Vision."
      />
      <TabBar
        value={mode}
        onChange={(v) => {
          setMode(v);
          setResult(null);
        }}
        options={["Monument", "Street Food", "Craft & Artisan", "Signboard"]}
      />
      <div className="grid-two">
        <section className="panel">
          <div className="scanner-area">
            {camera ? (
              <video
                ref={video}
                autoPlay
                playsInline
                muted
                aria-label="Camera preview"
              />
            ) : image ? (
              <img src={image} alt="Selected image to identify" />
            ) : (
              <div className="scanner-placeholder">
                <ScanLine size={47} />
                <h3>What caught your eye?</h3>
                <p>
                  Open your camera or upload a photo. Let curiosity lead the
                  way.
                </p>
              </div>
            )}
            {busy && <div className="scanner-line" />}
          </div>
          <div className="actions mt-5">
            {camera ? (
              <>
                <Button onClick={capture}>
                  <Camera size={16} />
                  Capture photo
                </Button>
                <Button variant="secondary" onClick={stop}>
                  Stop camera
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => void openCamera()}>
                <Camera size={16} />
                Open camera
              </Button>
            )}
            <label className="btn btn-secondary cursor-pointer">
              <Upload size={16} />
              Upload image
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files?.[0]) upload(e.target.files[0]);
                }}
              />
            </label>
            <Button
              busy={busy}
              disabled={!image || camera}
              onClick={() => void analyze()}
            >
              <Sparkles size={16} />
              Identify image
            </Button>
          </div>
          <p className="inline-note">
            Image identification uses Gemini only when configured. Images are
            sent to the AI service for analysis, not saved as photographs.
          </p>
        </section>
        <section className="panel">
          {result ? (
            <>
              <SourceBadge source={result.source} />
              {result.available ? (
                <>
                  <h2 className="mt-5">{result.name}</h2>
                  <p className="muted mt-3">
                    {result.category} · Confidence: {result.confidence} (AI
                    estimate)
                  </p>
                  <p className="transcript mt-5">{result.description}</p>
                  <div className="review-grid">
                    <div>
                      <small>ERA / CONTEXT</small>
                      <b>{result.era}</b>
                    </div>
                    <div>
                      <small>PRICE GUIDANCE</small>
                      <b>{result.price}</b>
                    </div>
                  </div>
                  <div className="hint">
                    <ShieldCheck size={18} />
                    <p>{result.tip}</p>
                  </div>
                  <p className="inline-note">
                    AI identification can be wrong. It cannot verify food
                    ingredients, authenticity, safety, or current prices.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-5">Your image is ready.</h2>
                  <p className="muted mt-4">{result.description}</p>
                </>
              )}
            </>
          ) : (
            <div className="scanner-placeholder mx-auto">
              <Sparkles size={36} />
              <h3 className="!text-gray-500">A story behind what you see.</h3>
              <p>
                Your identification and context will appear here after analysis.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
