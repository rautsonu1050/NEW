/**
 * Business Component
 *
 * Handles UI rendering and state management for the business feature.
 */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Users,
  MousePointerClick,
  Ticket,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  FileCheck2,
  Upload,
  PenLine,
  Eye,
  Pause,
  Play,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useYatra } from "../store";
import { api, money } from "../lib/utils";
import type { Business, Offer } from "../lib/types";
import { cities } from "../data/cities";
import {
  PageTitle,
  Button,
  LinkButton,
  Stat,
  SectionTitle,
  Modal,
  SelectField,
  Empty,
  SourceBadge,
  Photo,
} from "../components/shared";
const categories = [
  "Hotel & Lodging",
  "Local Restaurant",
  "Heritage Homestay",
  "Licensed Tour Guide",
  "Eco Taxi & Cab Provider",
  "Handicrafts & Textiles",
  "Souvenir & Artisan Store",
  "Adventure & Trek Operator",
  "Cultural Experience Host",
  "Traditional Street Food",
];
/** Renders the BusinessPage view. */
export default function BusinessPage({
  view,
}: {
  view: "dashboard" | "offers" | "register";
}) {
  const { state, mutate } = useYatra();
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [selected, setSelected] = useState("");
  const businesses = state?.businesses || [];
  const owned = businesses.filter(
    (b) => (b as Business & { canManage?: boolean }).canManage !== false,
  );
  const business =
    owned.find((b) => b.id === selected) ||
    owned.find((b) => b.status === "Verified") ||
    owned[0];
  const offers =
    state?.offers.filter((o) => o.businessId === business?.id) || [];
  const interest = offers.reduce((n, o) => n + o.clicks, 0);
  if (view === "register") return <RegisterBusiness />;
  return (
    <>
      <PageTitle
        eyebrow="GREAT JOURNEYS START WITH LOCAL PEOPLE"
        title={
          view === "offers"
            ? "A little local invitation."
            : business?.name || "Your place in the journey."
        }
        description={
          view === "offers"
            ? "Create and manage offers for travelers exploring your neighborhood."
            : business?.address ||
              "Welcome travelers into the story of your business."
        }
        actions={
          <>
            <LinkButton href="/business/register" secondary>
              <Store size={15} />
              Register business
            </LinkButton>
            <Button
              disabled={business?.status !== "Verified"}
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              <Plus size={16} />
              Create offer
            </Button>
          </>
        }
      />
      {owned.length > 1 && (
        <div className="mb-6 max-w-sm">
          <SelectField
            label="Your business"
            value={business?.id || ""}
            onChange={setSelected}
            options={owned.map((b) => ({ label: b.name, value: b.id }))}
          />
        </div>
      )}
      {!business ? (
        <Empty
          title="Introduce your business"
          description="Create a profile and submit it for verification before publishing offers."
          href="/business/register"
          action="Register business"
        />
      ) : (
        <>
          <span
            className={
              "status-badge " +
              (business.status === "Verified" ? "" : "pending")
            }
          >
            {business.status}
          </span>
          {business.note && (
            <div className="hint">
              <p>{business.note}</p>
            </div>
          )}
          {view === "dashboard" && (
            <>
              <div className="grid-four mt-5">
                <Stat
                  label="Traveler interest"
                  value={interest}
                  sub="Unique offer interest in this workspace"
                  icon={Users}
                />
                <Stat
                  label="Published offers"
                  value={offers.filter((o) => o.active).length}
                  sub="Active local invitations"
                  icon={Ticket}
                />
                <Stat label="Total offers" value={offers.length} icon={Store} />
                <Stat
                  label="Verification"
                  value={business.status}
                  sub="Admin review status"
                  icon={FileCheck2}
                  color="green"
                />
              </div>
              <div className="demand-banner">
                <Sparkles size={28} />
                <div>
                  <h3>
                    {simulated
                      ? "Demo scenario: lunch demand is rising."
                      : interest
                        ? "Travelers are showing interest."
                        : "Make it easy to discover your business."}
                  </h3>
                  <p>
                    {simulated
                      ? "A simulated group of 24 travelers is looking for vegetarian lunch near Red Fort, between 1 PM and 3 PM."
                      : interest +
                        " offer interests recorded. Keep your time window, location and menu details clear."}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setModal(true);
                  }}
                  disabled={business.status !== "Verified"}
                >
                  Create a local offer
                  <ArrowRight size={15} />
                </Button>
              </div>
              <p className="inline-note">
                Metrics come from stored offer activity. Nearby tourist
                location, impressions and supplier bookings are not tracked by a
                live provider.
              </p>
              {state?.demo && (
                <div className="actions">
                  <Button
                    variant="secondary"
                    onClick={() => setSimulated((v) => !v)}
                  >
                    <TrendingUp size={15} />
                    {simulated
                      ? "End demand simulation"
                      : "Simulate demand spike"}
                  </Button>
                </div>
              )}
            </>
          )}
          <SectionTitle
            title={
              view === "offers" ? "Your offers" : "A welcome worth sharing"
            }
            subtitle="Clear details help travelers decide."
          />
          {offers.length ? (
            offers.map((o) => (
              <article className="offer-card" key={o.id}>
                {o.image && <Photo src={o.image} alt={o.title} eager={false} />}
                <div className="offer-discount">
                  {o.discount}%<small>OFF</small>
                </div>
                <div>
                  <span
                    className={"status-badge " + (o.active ? "" : "pending")}
                  >
                    {o.active ? "Active" : "Paused"}
                  </span>
                  <h3 className="mt-3">{o.title}</h3>
                  <p>{o.description}</p>
                  <p className="mt-2 text-sm">
                    <strong>Food:</strong> {o.food} <br />
                    <strong>Location:</strong> {o.location} ({o.lat.toFixed(4)}, {o.lng.toFixed(4)})<br />
                    <strong>Price:</strong> {money(o.price)} (Original)
                  </p>
                  <p className="mt-2">
                    {o.timeWindow} · {o.target}
                  </p>
                  <p>{o.clicks} traveler interests</p>
                  <div className="actions">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(o);
                        setModal(true);
                      }}
                    >
                      <PenLine size={14} />
                      Edit offer
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        void mutate(
                          "business/offer-toggle",
                          { id: o.id },
                          o.active ? "Offer paused" : "Offer activated",
                        ).catch(() => {})
                      }
                    >
                      {o.active ? <Pause size={14} /> : <Play size={14} />}{" "}
                      {o.active ? "Pause" : "Activate"}
                    </Button>
                    <LinkButton href="/explore" secondary>
                      <Eye size={14} />
                      View traveler page
                    </LinkButton>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <Empty
              title="Your first invitation is waiting"
              description={
                business.status === "Verified"
                  ? "Create an offer with a clear discount, time window and audience."
                  : "Your business needs approval before it can publish offers."
              }
            />
          )}
        </>
      )}
      <OfferModal
        open={modal}
        onClose={() => setModal(false)}
        business={business}
        existing={editing}
      />
    </>
  );
}
function OfferModal({
  open,
  onClose,
  business,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  business?: Business;
  existing: Offer | null;
}) {
  const { mutate } = useYatra();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState(20);
  const [price, setPrice] = useState(100);
  const [food, setFood] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [timeWindow, setTimeWindow] = useState("12:00 - 15:00");
  const [target, setTarget] = useState("Travelers within 2 km");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setTitle(existing?.title || "");
    setDescription(existing?.description || "");
    setDiscount(existing?.discount || 20);
    setPrice(existing?.price || 100);
    setFood(existing?.food || "");
    
    // Auto-fill coordinates for new offers based on business city
    if (existing) {
      setLocation(existing.location);
      setLat(existing.lat);
      setLng(existing.lng);
    } else {
      setLocation("");
      if (business?.city) {
        const c = cities.find((x) => x.name.toLowerCase() === business.city.toLowerCase());
        if (c) {
          setLat(c.lat);
          setLng(c.lng);
        } else {
          setLat(0);
          setLng(0);
        }
      }
    }
    
    setTimeWindow(existing?.timeWindow || "12:00 - 15:00");
    setTarget(existing?.target || "Travelers within 2 km");
    setFile(null);
  }, [existing, open, business?.city]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setBusy(true);
    try {
      let image = existing?.image;
      if (file) {
        const data = new FormData();
        data.append("file", file);
        const r = await fetch("/api/uploads", { method: "POST", body: data });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        image = result.key;
      }
      await mutate(
        "business/offer",
        {
          id: existing?.id,
          businessId: business.id,
          title,
          description,
          discount,
          price,
          food,
          location,
          lat,
          lng,
          timeWindow,
          target,
          image,
        },
        existing ? "Offer updated" : "Offer published",
      );
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        existing
          ? "Refine your invitation."
          : "Invite travelers to discover you."
      }
      description={business?.name || "Select a verified business first."}
    >
      <form className="form-stack" onSubmit={save}>
        <div className="field">
          <label htmlFor="offer-title">Offer title</label>
          <input
            id="offer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Afternoon thali, a little treat"
            required
            minLength={3}
            maxLength={100}
          />
        </div>
        <div className="field">
          <label htmlFor="offer-description">Description</label>
          <textarea
            id="offer-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={5}
            rows={3}
            maxLength={1000}
          />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="offer-food">Food / Menu Highlight</label>
            <input
              id="offer-food"
              value={food}
              onChange={(e) => setFood(e.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div className="field">
            <label htmlFor="offer-price">Original Price</label>
            <input
              id="offer-price"
              type="number"
              min="1"
              max="100000"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="offer-discount">Discount (%)</label>
            <input
              id="offer-discount"
              type="number"
              min="1"
              max="90"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="offer-location">Exact Location</label>
            <input
              id="offer-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              minLength={3}
            />
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="offer-lat">Latitude</label>
            <input
              id="offer-lat"
              type="number"
              step="any"
              min="-90"
              max="90"
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="offer-lng">Longitude</label>
            <input
              id="offer-lng"
              type="number"
              step="any"
              min="-180"
              max="180"
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="offer-window">Time window</label>
          <input
            id="offer-window"
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div className="field">
          <label htmlFor="offer-target">Who is this for?</label>
          <input
            id="offer-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div className="field">
          <label htmlFor="offer-file">
            Offer image (optional, up to 5 MB)
          </label>
          <input
            id="offer-file"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (f && f.size > 5 * 1024 * 1024) {
                toast.error("Choose a file under 5 MB");
                e.target.value = "";
                return;
              }
              setFile(f);
            }}
          />
        </div>
        <p className="inline-note">
          The audience is a description. Automated geotargeting is not enabled.
        </p>
        <Button
          type="submit"
          busy={busy}
          disabled={business?.status !== "Verified"}
        >
          {existing ? "Save offer" : "Publish offer"}
          <ArrowRight size={15} />
        </Button>
      </form>
    </Modal>
  );
}
function RegisterBusiness() {
  const { state, mutate } = useYatra();
  const router = useRouter();
  const [name, setName] = useState("");
  const [owner, setOwner] = useState(state?.profile.name || "");
  const [category, setCategory] = useState(categories[0]);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Delhi");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let document: string | undefined;
      if (file) {
        const data = new FormData();
        data.append("file", file);
        const r = await fetch("/api/uploads", { method: "POST", body: data });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        document = result.key;
      }
      await mutate(
        "business/register",
        { name, owner, category, address, city, phone, document },
        "Business submitted for verification",
      );
      router.push("/business");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="LOCAL PEOPLE. LASTING IMPRESSIONS."
        title="Bring your business into the journey."
        description="Introduce your work and submit your details for review."
      />
      <div className="content-grid">
        <form className="panel form-stack" onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="business-name">Business name</label>
              <input
                id="business-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="field">
              <label htmlFor="business-owner">Owner / operator</label>
              <input
                id="business-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
                minLength={2}
              />
            </div>
          </div>
          <SelectField
            label="Business category"
            value={category}
            onChange={setCategory}
            options={categories}
          />
          <div className="field">
            <label htmlFor="business-address">
              Street address and landmark
            </label>
            <textarea
              id="business-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              minLength={5}
              rows={3}
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="business-city">City</label>
              <input
                id="business-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="field">
              <label htmlFor="business-phone">Phone / WhatsApp</label>
              <input
                id="business-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                pattern="[+0-9 ()-]{7,20}"
                type="tel"
                placeholder="+91..."
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="business-file">
              Verification document (optional, up to 5 MB)
            </label>
            <input
              id="business-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f && f.size > 5 * 1024 * 1024) {
                  toast.error("Choose a file under 5 MB");
                  e.target.value = "";
                  return;
                }
                setFile(f);
              }}
            />
          </div>
          <p className="inline-note">
            Documents are stored privately for your application and the
            verification team.
          </p>
          <Button type="submit" busy={busy}>
            Submit for verification
            <ArrowRight size={16} />
          </Button>
        </form>
        <aside className="panel">
          <div className="mini-icon green">
            <FileCheck2 size={20} />
          </div>
          <h2 className="mt-5">A little trust goes a long way.</h2>
          <p className="muted mt-4">
            An administrator reviews your details. After approval, you can
            publish offers and track traveler interest.
          </p>
          <div className="overview-day">
            <span className="day-number">1</span>
            <h3>Introduce your business</h3>
          </div>
          <div className="overview-day">
            <span className="day-number">2</span>
            <h3>Submit for review</h3>
          </div>
          <div className="overview-day">
            <span className="day-number">3</span>
            <h3>Welcome travelers</h3>
          </div>
        </aside>
      </div>
    </>
  );
}
