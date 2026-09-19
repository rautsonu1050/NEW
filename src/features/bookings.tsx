/**
 * Bookings Component
 *
 * Handles UI rendering and state management for the bookings feature.
 */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BedDouble,
  MapPin,
  Star,
  Check,
  ShieldCheck,
  Users,
  CalendarDays,
  Search,
  ArrowRight,
  Ticket,
  Wallet,
  Plus,
  Trash2,
  Utensils,
  TrainFront,
  ShoppingBag,
  CheckCircle2,
  Coins,
  IndianRupee,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { useYatra } from "../store";
import { api, money, today } from "../lib/utils";
import { loadScript } from "../lib/browser";
import type { Stay, Experience, Booking, Expense } from "../lib/types";
import {
  PageTitle,
  Button,
  LinkButton,
  Photo,
  SelectField,
  CityPicker,
  CheckOption,
  Empty,
  Modal,
  Confirm,
  TabBar,
  Stat,
  SectionTitle,
} from "../components/shared";
const colors = [
  "#8170d6",
  "#92bbae",
  "#d9b48d",
  "#96accc",
  "#c5a1c4",
  "#b9bd85",
  "#a4b2b8",
];
/** Renders the Stays view. */
export default function Stays() {
  const { city, setCity, catalog, trip, state } = useYatra();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All stays");
  const [max, setMax] = useState(20000);
  const [veg, setVeg] = useState(false);
  const [lift, setLift] = useState(false);
  const [senior, setSenior] = useState(false);
  const [solo, setSolo] = useState(false);
  const [water, setWater] = useState(false);
  const [power, setPower] = useState(false);
  const [fit, setFit] = useState("Any traveler");
  const [selected, setSelected] = useState<Stay | Experience | null>(null);
  const [type, setType] = useState<"Stay" | "Experience">("Stay");
  useEffect(() => {
    if (params.get("city")) setCity(params.get("city")!);
  }, [params, setCity]);
  useEffect(() => {
    const exp = catalog.experiences.find(
      (e) => e.id === params.get("experience"),
    );
    if (exp) {
      setSelected(exp);
      setType("Experience");
    }
    const stay = catalog.stays.find((e) => e.id === params.get("stay"));
    if (stay) {
      setSelected(stay);
      setType("Stay");
    }
  }, [catalog, params]);
  const stays = catalog.stays.filter(
    (s) =>
      (s.name + " " + s.location + " " + s.type)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All stays" ||
        s.type.toLowerCase().includes(category.toLowerCase())) &&
      s.price <= max &&
      (!veg || s.veg) &&
      (!lift || s.lift) &&
      (!senior || s.senior) &&
      (!solo || s.solo) &&
      (!water || s.water) &&
      (!power || s.power) &&
      (fit === "Any traveler" ||
        s.suitableFor.some((x) =>
          x.toLowerCase().includes(fit.toLowerCase().split(" ")[0]),
        )),
  );
  return (
    <>
      <PageTitle
        eyebrow="STAY CLOSER TO THE STORY"
        title={"Somewhere to belong in " + city + "."}
        description="From a quiet ashram to a welcoming family homestay."
        actions={
          <LinkButton href="/bookings" secondary>
            <Ticket size={16} />
            My bookings
          </LinkButton>
        }
      />
      <div className="explore-controls">
        <div className="full-search">
          <Search size={18} />
          <input
            aria-label="Search stays"
            placeholder="Search by stay, neighborhood, or landmark..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <CityPicker label="DESTINATION" value={city} onChange={setCity} />
      </div>
      <div className="content-grid">
        <section>
          <p className="inline-note">
            {stays.length} stays · Demo availability, prices and suitability.
            Photographs show the destination.
          </p>
          {stays.map((s) => {
            const cap =
              ((trip?.preferences.budget || 25000) * 0.35) /
              Math.max(1, (trip?.days.length || 3) - 1);
            const score = Math.min(
              99,
              Math.round(
                45 +
                  s.rating * 5 +
                  (s.price < cap ? 15 : 0) +
                  (lift && s.lift ? 7 : 0) +
                  (veg && s.veg ? 7 : 0),
              ),
            );
            return (
              <article key={s.id} className="stay-card">
                <Photo src={s.image} alt={city + " destination photograph"} />
                <div>
                  <p className="stay-category">
                    {s.type} <span>· {s.rating} sample rating</span>
                  </p>
                  <h3>{s.name}</h3>
                  <p className="stay-location">
                    <MapPin size={13} />
                    {s.location}
                  </p>
                  <div className="amenities">
                    {s.amenities.slice(0, 5).map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                  </div>
                  <span className="match-badge">
                    <CheckCircle2 size={12} />
                    {score}% preference fit
                  </span>
                  <details className="inline-note">
                    <summary>Why this stay fits</summary>
                    <p>{s.reason}</p>
                    <p>{s.proximity}</p>
                    <p>
                      Suitability comes from sample data. Accessibility and
                      safety are not verified.
                    </p>
                  </details>
                  <div className="stay-bottom">
                    <div className="stay-price">
                      {money(s.price)}
                      <small> / room / night</small>
                    </div>
                    <Button
                      onClick={() => {
                        setSelected(s);
                        setType("Stay");
                      }}
                    >
                      Book stay
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
          {!stays.length && (
            <Empty
              title="A different kind of stay?"
              description="Try a wider budget or fewer filters to see more places."
            />
          )}
        </section>
        <aside className="panel filter-panel">
          <h3>Your kind of stay</h3>
          <SelectField
            label="Stay category"
            value={category}
            onChange={setCategory}
            options={[
              "All stays",
              ...Array.from(new Set(catalog.stays.map((s) => s.type))),
            ]}
          />
          <div className="field">
            <label htmlFor="max-night">Maximum per night (INR)</label>
            <input
              id="max-night"
              type="number"
              min="100"
              max="100000"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
            />
          </div>
          <SelectField
            label="Traveling as"
            value={fit}
            onChange={setFit}
            options={["Any traveler", "Solo", "Couple", "Family", "Pilgrimage"]}
          />
          <h3 className="mt-6">The little things that matter</h3>
          {[
            [veg, setVeg, "Pure veg / Jain options"],
            [lift, setLift, "Lift available"],
            [senior, setSenior, "Senior friendly"],
            [solo, setSolo, "Solo traveler amenities"],
            [water, setWater, "RO water"],
            [power, setPower, "Power backup"],
          ].map(([value, setter, label]) => (
            <CheckOption
              key={String(label)}
              label={String(label)}
              checked={Boolean(value)}
              onChange={() => {
                (setter as React.Dispatch<React.SetStateAction<boolean>>)(
                  (x) => !x,
                );
              }}
            />
          ))}
          <Button
            variant="ghost"
            onClick={() => {
              setVeg(false);
              setLift(false);
              setSenior(false);
              setSolo(false);
              setWater(false);
              setPower(false);
              setMax(20000);
              setFit("Any traveler");
              setCategory("All stays");
            }}
          >
            Reset filters
          </Button>
          <p className="inline-note">
            Ask the host to confirm any requirement that is essential to your
            stay.
          </p>
        </aside>
      </div>
      <BookingModal
        item={selected}
        type={type}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
function BookingModal({
  item,
  type,
  onClose,
}: {
  item: Stay | Experience | null;
  type: "Stay" | "Experience";
  onClose: () => void;
}) {
  const { state, trip, mutate } = useYatra();
  const router = useRouter();
  const [date, setDate] = useState(trip?.preferences.startDate || today());
  const [nights, setNights] = useState(2);
  const [guests, setGuests] = useState(trip?.preferences.travelers || 2);
  const [name, setName] = useState(state?.profile.name || "");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<{
    id: string;
    amount: number;
    payment: string;
    key?: string;
  } | null>(null);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    setOrder(null);
    setFailure("");
  }, [item?.id]);
  if (!item) return null;
  const title = "name" in item ? item.name : item.title;
  const price = item.price;
  const rooms = type === "Stay" ? Math.ceil(guests / 2) : 0;
  const total = type === "Stay" ? price * nights * rooms : price * guests;
  const confirmed = async (
    orderId: string,
    paymentId?: string,
    signature?: string,
  ) => {
    try {
      await mutate(
        "bookings/confirm",
        { orderId, paymentId, signature },
        "Booking saved",
      );
      onClose();
      router.push("/bookings");
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      const result = await api<{
        id: string;
        amount: number;
        payment: string;
        key?: string;
      }>("bookings/order", {
        itemId: item.id,
        tripId: trip?.preferences.destination === item.city ? trip.id : null,
        date,
        nights,
        guests,
        type,
        guest: name,
      });
      setOrder(result);
      if (result.payment === "test") {
        await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        const checkout = new window.Razorpay({
          key: result.key,
          amount: Math.round(result.amount * 100),
          currency: "INR",
          name: "YATRA AI",
          description: "Test booking: " + title,
          order_id: result.id,
          prefill: { name, email: state?.profile.email },
          handler: (p: any) => {
            void confirmed(
              result.id,
              p.razorpay_payment_id,
              p.razorpay_signature,
            );
          },
          modal: { ondismiss: () => setBusy(false) },
          theme: { color: "#5B4CF0" },
        });
        checkout.open();
      } else setBusy(false);
    } catch (e) {
      setFailure((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={
        order ? "Review your demo payment" : "A little place in your journey."
      }
      description={title}
    >
      {order?.payment === "demo" ? (
        <>
          <div className="hint warning">
            <ShieldCheck size={20} />
            <div>
              <b>Demo payment · No money is charged</b>
              <p>
                This creates a demo booking and expense. It does not reserve a
                room or issue a supplier ticket.
              </p>
            </div>
          </div>
          <div className="review-grid">
            <div>
              <small>GUEST</small>
              <b>{name}</b>
            </div>
            <div>
              <small>DATE</small>
              <b>{date}</b>
            </div>
            <div>
              <small>GUESTS / ROOMS</small>
              <b>
                {guests} guests{type === "Stay" ? " · " + rooms + " rooms" : ""}
              </b>
            </div>
            <div>
              <small>TOTAL</small>
              <b>{money(order.amount)}</b>
            </div>
          </div>
          <Button
            busy={busy}
            onClick={() => {
              setBusy(true);
              void confirmed(order.id);
            }}
          >
            Complete demo payment · {money(order.amount)}
          </Button>
          <Button variant="ghost" onClick={() => setOrder(null)}>
            Change booking details
          </Button>
        </>
      ) : (
        <form className="form-stack" onSubmit={create}>
          <div className="field">
            <label htmlFor="booking-name">Guest name</label>
            <input
              id="booking-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="booking-date">
                {type === "Stay" ? "Check-in date" : "Experience date"}
              </label>
              <input
                id="booking-date"
                type="date"
                min={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="booking-guests">Guests</label>
              <input
                id="booking-guests"
                type="number"
                min="1"
                max="20"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                required
              />
            </div>
          </div>
          {type === "Stay" && (
            <div className="field">
              <label htmlFor="booking-nights">Nights</label>
              <input
                id="booking-nights"
                type="number"
                min="1"
                max="30"
                value={nights}
                onChange={(e) => setNights(Number(e.target.value))}
                required
              />
            </div>
          )}
          <div className="fare-result">
            <span>BOOKING ESTIMATE</span>
            <strong>{money(total)}</strong>
            <p>
              {type === "Stay"
                ? `${money(price)} × ${nights} nights × ${rooms} rooms. Maximum 2 guests per room.`
                : `${money(price)} × ${guests} guests.`}
            </p>
            <p>
              Demo catalog availability. Payment mode is confirmed before
              checkout.
            </p>
          </div>
          <Button type="submit" busy={busy}>
            Continue to checkout
            <ArrowRight size={16} />
          </Button>
        </form>
      )}
      {failure && <p className="form-error">{failure}</p>}
    </Modal>
  );
}
function QRPass({ booking }: { booking: Booking }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    loadScript("/vendor/qrcode.js")
      .then(() => {
        const qr = window.qrcode(0, "M");
        qr.addData(
          "YATRA:" + booking.payment.toUpperCase() + ":" + booking.code,
        );
        qr.make();
        setSrc(qr.createDataURL(4, 8));
      })
      .catch(() => {});
  }, [booking.code, booking.payment]);
  return (
    <div className="qr-pass">
      {src ? (
        <img src={src} alt={"QR booking reference " + booking.code} />
      ) : (
        <Ticket size={40} />
      )}
      <span>
        {booking.payment === "demo" ? "DEMO REFERENCE" : "TEST REFERENCE"}
      </span>
    </div>
  );
}
/** Renders the Bookings view. */
export function Bookings() {
  const { state, mutate } = useYatra();
  const [tab, setTab] = useState("Upcoming");
  const [cancel, setCancel] = useState<Booking | null>(null);
  const [pass, setPass] = useState<Booking | null>(null);
  const bookings = (state?.bookings || []).filter((b) =>
    tab === "Cancelled"
      ? b.status === "Cancelled"
      : tab === "Completed"
        ? b.status === "Completed" ||
          (b.date < today() && b.status === "Confirmed")
        : b.status === "Confirmed" && b.date >= today(),
  );
  return (
    <>
      <PageTitle
        eyebrow="ALL SET FOR WHAT’S NEXT"
        title="Your bookings & little adventures."
        description="Stays, experiences, and the details that bring your journey together."
        actions={
          <LinkButton href="/stays">
            <Plus size={16} />
            Find a stay
          </LinkButton>
        }
      />
      <TabBar
        value={tab}
        onChange={setTab}
        options={["Upcoming", "Completed", "Cancelled"]}
      />
      {bookings.length ? (
        <div className="booking-list">
          {bookings.map((b) => (
            <article className="booking-card" key={b.id}>
              <div className="booking-card-top">
                <div>
                  <h3>{b.title}</h3>
                  <p>
                    {b.code} · {b.type}
                  </p>
                </div>
                <span
                  className={
                    "status-badge " +
                    (b.status === "Cancelled" ? "cancelled" : "")
                  }
                >
                  {tab === "Completed" ? "Completed" : b.status}
                </span>
              </div>
              <div className="booking-card-body">
                <div className="booking-data">
                  <div>
                    <small>DATE</small>
                    <b>{b.date}</b>
                  </div>
                  <div>
                    <small>{b.type === "Stay" ? "NIGHTS" : "GUESTS"}</small>
                    <b>{b.type === "Stay" ? b.nights : b.guests}</b>
                  </div>
                  <div>
                    <small>GUEST</small>
                    <b>{b.guest}</b>
                  </div>
                  <div>
                    <small>
                      {b.payment === "demo" ? "DEMO AMOUNT" : "TEST PAYMENT"}
                    </small>
                    <b>{money(b.amount)}</b>
                  </div>
                </div>
                <QRPass booking={b} />
              </div>
              <div className="booking-card-footer">
                <Button variant="ghost" onClick={() => setPass(b)}>
                  View pass
                  <ArrowRight size={14} />
                </Button>
                {tab === "Upcoming" && (
                  <Button variant="ghost" onClick={() => setCancel(b)}>
                    Cancel booking
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={"No " + tab.toLowerCase() + " bookings yet."}
          description={
            tab === "Upcoming"
              ? "Find a stay that feels right, then keep all the details here."
              : "Your booking history will appear here."
          }
          href="/stays"
          action="Explore stays"
        />
      )}
      <p className="inline-note">
        Demo and test bookings are not reservations with a hotel or attraction.
        Confirm arrangements with the provider before traveling.
      </p>
      <Confirm
        open={!!cancel}
        onClose={() => setCancel(null)}
        title="Cancel this booking?"
        description={
          cancel?.payment === "demo"
            ? "Your demo booking will be cancelled and its expense removed. No refund is needed because no money was charged."
            : "Test payments require refund verification. A booking stays confirmed until that verification succeeds."
        }
        onConfirm={() =>
          void mutate(
            "bookings/cancel",
            { id: cancel!.id },
            "Booking cancelled",
          )
            .then(() => setCancel(null))
            .catch(() => {})
        }
      />
      <Modal
        open={!!pass}
        onClose={() => setPass(null)}
        title="Your booking reference"
        description={pass?.title}
      >
        {pass && (
          <>
            <div className="mx-auto w-44">
              <QRPass booking={pass} />
            </div>
            <p className="text-center">{pass.code}</p>
            <p className="muted text-center">
              {pass.guest} · {pass.date} · {pass.guests} guests
            </p>
            <p className="inline-note">
              This QR encodes a {pass.payment} booking reference. It is not a
              supplier entry ticket.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
/** Renders the Budget view. */
export function Budget() {
  const { state, trip, mutate } = useYatra();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<Expense | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [method, setMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const expenses = (state?.expenses || []).filter((e) =>
    trip ? e.tripId === trip.id : !e.tripId,
  );
  const spent = expenses.reduce((n, e) => n + e.amount, 0);
  const total = trip?.preferences.budget || 0;
  const categories = [
    "Stay",
    "Food",
    "Transport",
    "Attractions",
    "Activities",
    "Shopping",
    "Miscellaneous",
  ];
  const allocations = categories
    .map((name, i) => ({
      name,
      value: expenses
        .filter((e) => e.category === name)
        .reduce((n, e) => n + e.amount, 0),
      color: colors[i],
    }))
    .filter((x) => x.value > 0);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await mutate(
        "expenses",
        {
          tripId: trip?.id || null,
          title,
          amount: Number(amount),
          category,
          method,
          notes,
        },
        "Expense recorded",
      );
      setOpen(false);
      setTitle("");
      setAmount("");
      setNotes("");
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="MAKE EVERY RUPEE COUNT"
        title="A little clarity for your travel wallet."
        description={trip ? trip.title : "Expenses not attached to a trip"}
        actions={
          <>
            <LinkButton href="/currency" secondary>
              <Coins size={15} />
              Currency tools
            </LinkButton>
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} />
              Add expense
            </Button>
          </>
        }
      />
      {state && state.trips.length > 1 && (
        <div className="max-w-sm mb-5">
          <SelectField
            label="Budget for journey"
            value={trip?.id || ""}
            onChange={(v) =>
              void mutate("trips/active", { tripId: v }).catch(() => {})
            }
            options={state.trips.map((t) => ({ label: t.title, value: t.id }))}
          />
        </div>
      )}
      <div className="grid-four">
        <Stat label="Total budget" value={money(total)} icon={Wallet} />
        <Stat
          label="Recorded expenses"
          value={money(spent)}
          sub={expenses.length + " entries"}
          icon={IndianRupee}
        />
        <Stat
          label="Remaining balance"
          value={money(total - spent)}
          icon={Coins}
          color="green"
        />
        <Stat
          label="Emergency reserve"
          value={money(trip?.emergency || 0)}
          sub="Part of the remaining balance"
          icon={ShieldCheck}
        />
      </div>
      {total > 0 && spent > total && (
        <div className="hint warning">
          <p>
            You have recorded {money(spent - total)} more than your budget.
            Review your expenses and remaining plans.
          </p>
        </div>
      )}
      <div className="content-grid mt-6">
        <section className="panel">
          <SectionTitle
            title="The little things, all accounted for"
            subtitle="Recorded expenses for this journey."
          />
          {expenses.length ? (
            expenses.map((e) => (
              <div className="expense-row" key={e.id}>
                <div
                  className={
                    "mini-icon " +
                    (e.category === "Food"
                      ? "orange"
                      : e.category === "Transport"
                        ? "blue"
                        : "purple")
                  }
                >
                  {e.category === "Food" ? (
                    <Utensils size={18} />
                  ) : e.category === "Transport" ? (
                    <TrainFront size={18} />
                  ) : (
                    <Wallet size={18} />
                  )}
                </div>
                <div>
                  <h3>{e.title}</h3>
                  <p>
                    {e.category} · {e.method} · {e.date}
                    {e.notes ? " · " + e.notes : ""}
                  </p>
                </div>
                <strong>{money(e.amount)}</strong>
                {!e.bookingId && (
                  <button
                    aria-label={"Delete expense " + e.title}
                    onClick={() => setRemove(e)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <Empty
              title="A fresh travel wallet"
              description="Add expenses as you go. Confirmed demo bookings appear here automatically."
            />
          )}
        </section>
        <aside className="panel">
          <h3>Where it’s going</h3>
          {allocations.length ? (
            <>
              <div className="budget-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocations}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={75}
                      outerRadius={98}
                      paddingAngle={4}
                    >
                      {allocations.map((x) => (
                        <Cell key={x.name} fill={x.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center">
                  <strong>{money(spent)}</strong>
                  <span>RECORDED SPENDING</span>
                </div>
              </div>
              <div className="budget-legend">
                {allocations.map((x) => (
                  <div key={x.name}>
                    <i style={{ background: x.color }} />
                    {x.name}
                    <b>{money(x.value)}</b>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="inline-note">
              Your spending breakdown appears after your first expense.
            </p>
          )}
          {trip && (
            <>
              <SectionTitle title="Planned costs" />
              {Object.entries(trip.breakdown).map(([k, v], i) => (
                <div className="budget-legend" key={k}>
                  <div>
                    <i style={{ background: colors[i] }} />
                    {k}
                    <b>{money(v)}</b>
                  </div>
                </div>
              ))}
              <p className="inline-note">
                Estimates total {money(trip.estimate)}. They are separate from
                actual recorded spending.
              </p>
            </>
          )}
        </aside>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="A little expense, neatly recorded."
        description="Keep track of the everyday costs of your journey."
      >
        <form onSubmit={save} className="form-stack">
          <div className="field">
            <label htmlFor="expense-title">Expense title</label>
            <input
              id="expense-title"
              placeholder="Lunch at a local kitchen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={2}
              required
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="expense-amount">Amount (INR)</label>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                max="1000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <SelectField
              label="Category"
              value={category}
              onChange={setCategory}
              options={categories}
            />
          </div>
          <SelectField
            label="Payment method"
            value={method}
            onChange={setMethod}
            options={["UPI", "GPay", "Cash", "Card"]}
          />
          <div className="field">
            <label htmlFor="expense-notes">Notes (optional)</label>
            <textarea
              id="expense-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button type="submit" busy={busy}>
            Save expense
          </Button>
        </form>
      </Modal>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Remove this expense?"
        description={
          (remove?.title || "This entry") +
          " will be removed from the recorded total."
        }
        onConfirm={() =>
          void mutate("expenses/delete", { id: remove!.id }, "Expense removed")
            .then(() => setRemove(null))
            .catch(() => {})
        }
      />
    </>
  );
}
