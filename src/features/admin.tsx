/**
 * Admin Component
 *
 * Handles UI rendering and state management for the admin feature.
 */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Store,
  Map,
  Leaf,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Plug,
  FileText,
  ArrowRight,
  BarChart3,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useYatra } from "../store";
import { api } from "../lib/utils";
import type { Business } from "../lib/types";
import {
  PageTitle,
  Button,
  LinkButton,
  Stat,
  SectionTitle,
  Modal,
  SelectField,
  Empty,
} from "../components/shared";
type Analytics = {
  travelers: number;
  trips: number;
  partners: number;
  hiddenShare: number;
  distribution: { name: string; value: number; hidden: boolean }[];
  source: string;
  demand: number;
};
/** Renders the Admin view. */
export default function Admin({
  view,
}: {
  view: "overview" | "businesses" | "analytics" | "integrations";
}) {
  const { state, mutate } = useYatra();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [integrations, setIntegrations] = useState<{
    items: {
      name: string;
      status: string;
      details: string;
      latency: number | null;
    }[];
    checkedAt: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All applications");
  const [review, setReview] = useState<Business | null>(null);
  const [decision, setDecision] = useState("Verified");
  const [note, setNote] = useState("");
  const load = async () => {
    setBusy(true);
    try {
      if (view === "integrations") setIntegrations(await api("integrations"));
      else setAnalytics(await api("analytics"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
  }, [view, state?.businesses, state?.trips]);
  const canVerify = state?.role === "admin";
  const filtered = (state?.businesses || []).filter(
    (b) => filter === "All applications" || b.status === filter,
  );
  const pending =
    state?.businesses.filter(
      (b) => b.status === "Pending" || b.status === "More information",
    ) || [];
  const title =
    view === "businesses"
      ? "The people behind better journeys."
      : view === "analytics"
        ? "A better balance of discovery."
        : view === "integrations"
          ? "Every connection, accounted for."
          : "A clearer view of the journey.";
  const decide = async () => {
    if (!review) return;
    try {
      await mutate(
        "business/verify",
        { id: review.id, status: decision, note },
        "Application updated",
      );
      setReview(null);
    } catch {}
  };
  return (
    <>
      <PageTitle
        eyebrow={
          state?.role === "authority"
            ? "TOURISM AUTHORITY"
            : "YATRA ADMINISTRATION"
        }
        title={title}
        description={
          view === "integrations"
            ? "Configuration and observed service status."
            : view === "businesses"
              ? "Review partner applications and keep the local network accountable."
              : "Understand planned travel patterns and help local places share the opportunity."
        }
        actions={
          <Button variant="secondary" onClick={() => void load()} busy={busy}>
            <RefreshCw size={15} />
            Refresh
          </Button>
        }
      />
      {error && (
        <div className="hint warning">
          <p>{error}</p>
        </div>
      )}
      {view === "integrations" ? (
        <section className="panel">
          <p className="inline-note">
            Checked{" "}
            {integrations
              ? new Date(integrations.checkedAt).toLocaleString()
              : "..."}{" "}
            · A configured key does not mean the service is online.
          </p>
          {integrations?.items.map((x) => (
            <div className="integration-row" key={x.name}>
              <div className="mini-icon purple">
                <Plug size={19} />
              </div>
              <div>
                <h3>{x.name}</h3>
                <p>{x.details}</p>
              </div>
              <span
                className={
                  "status-badge " + (x.status === "Online" ? "" : "pending")
                }
              >
                {x.status}
              </span>
              <small>
                {x.latency !== null ? x.latency + " ms" : "No live probe"}
              </small>
            </div>
          ))}
        </section>
      ) : (
        <>
          {view !== "businesses" && (
            <>
              <div className="grid-four">
                <Stat
                  label="Travelers"
                  value={analytics?.travelers ?? 0}
                  sub="Registered in the data scope"
                  icon={Users}
                />
                <Stat
                  label="Verified partners"
                  value={analytics?.partners ?? 0}
                  icon={Store}
                  color="green"
                />
                <Stat
                  label="Trips planned"
                  value={analytics?.trips ?? 0}
                  icon={Map}
                />
                <Stat
                  label="Hidden gem share"
                  value={(analytics?.hiddenShare ?? 0) + "%"}
                  sub="Share of planned itinerary stops"
                  icon={Leaf}
                  color="green"
                />
              </div>
              <p className="inline-note">
                {analytics?.source || "Reading saved data"} · These metrics
                describe stored plans, not live footfall or visitor tracking.
              </p>
              <div className="content-grid mt-5">
                <section className="panel">
                  <SectionTitle
                    title="Where journeys are taking shape"
                    subtitle="Attraction visits in stored itineraries."
                  />
                  {analytics?.distribution.length ? (
                    <div className="analytics-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.distribution.slice(0, 8)}
                          layout="vertical"
                          margin={{ left: 8, right: 20, top: 5, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="#eeedf3"
                          />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#aba7bb" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={125}
                            tick={{ fontSize: 11, fill: "#9293a7" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="value"
                            name="Planned visits"
                            radius={[0, 5, 5, 0]}
                            barSize={16}
                          >
                            {analytics.distribution.slice(0, 8).map((x, i) => (
                              <Cell
                                key={x.name}
                                fill={x.hidden ? "#92b7a6" : "#aa9bce"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty
                      title="No travel patterns yet"
                      description="Create itineraries to see the planned distribution of visits."
                    />
                  )}
                </section>
                <aside className="panel">
                  <div className="mini-icon green">
                    <Leaf size={21} />
                  </div>
                  <h2 className="mt-5">Make space for the quieter places.</h2>
                  <p className="muted mt-4">
                    {analytics?.hiddenShare
                      ? analytics.hiddenShare +
                        "% of planned stops are cataloged hidden gems."
                      : "There are no hidden-gem stops in the current plans."}
                  </p>
                  <p className="muted mt-4">
                    Promote suitable lesser-known places when popular stops
                    account for a large share of plans. Validate accessibility
                    and capacity with local operators before directing visitors.
                  </p>
                  <Link
                    href="/explore?category=Hidden%20Gems"
                    className="text-action"
                  >
                    Explore hidden gems
                    <ArrowRight size={14} />
                  </Link>
                  <div className="hint">
                    <Info size={18} />
                    <p>
                      Live crowd density needs a reliable footfall data
                      provider. Planned visits are not congestion measurements.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {view === "overview" && (
            <div className="demand-banner">
              <ShieldCheck size={30} />
              <div>
                <h3>{pending.length} partner applications need a look.</h3>
                <p>
                  Give local businesses a clear path from registration to
                  discovery.
                </p>
              </div>
              <LinkButton href="/admin/businesses" secondary>
                Review applications
                <ArrowRight size={15} />
              </LinkButton>
            </div>
          )}
          {view === "businesses" && (
            <>
              <div className="max-w-sm mb-6">
                <SelectField
                  label="Application status"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    "All applications",
                    "Pending",
                    "Verified",
                    "Rejected",
                    "More information",
                  ]}
                />
              </div>
              {filtered.length ? (
                <div className="table-wrap">
                  <Table className="data-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Owner & location</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Review</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <strong>{b.name}</strong>
                            <small>{b.category}</small>
                          </TableCell>
                          <TableCell>
                            {b.owner}
                            <small>{b.address}</small>
                            <small>{b.phone}</small>
                          </TableCell>
                          <TableCell>
                            {new Date(b.createdAt).toLocaleDateString("en-IN")}
                            {b.document && (
                              <a
                                className="text-action"
                                href={
                                  "/api/uploads/document?key=" +
                                  encodeURIComponent(b.document)
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                <FileText size={14} />
                                Document
                              </a>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                "status-badge " +
                                (b.status === "Verified" ? "" : "pending")
                              }
                            >
                              {b.status}
                            </span>
                            {b.note && <small>{b.note}</small>}
                          </TableCell>
                          <TableCell>
                            {canVerify ? (
                              <div className="table-actions">
                                <button
                                  onClick={() => {
                                    setReview(b);
                                    setDecision("Verified");
                                    setNote("");
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setReview(b);
                                    setDecision("More information");
                                    setNote("");
                                  }}
                                >
                                  Request info
                                </button>
                                <button
                                  onClick={() => {
                                    setReview(b);
                                    setDecision("Rejected");
                                    setNote("");
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="muted">Read-only access</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty
                  title="No applications in this view"
                  description="Change the status filter to see other partners."
                />
              )}
            </>
          )}
        </>
      )}
      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title="Review this local partner."
        description={review?.name}
      >
        <SelectField
          label="Decision"
          value={decision}
          onChange={setDecision}
          options={["Verified", "More information", "Rejected"]}
        />
        <div className="field">
          <label htmlFor="review-note">Review note</label>
          <textarea
            id="review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Explain the decision or list the information needed."
            maxLength={1000}
          />
        </div>
        <p className="inline-note">
          The decision and note are saved to the application. No email or
          message is sent automatically.
        </p>
        <Button onClick={() => void decide()}>Save review decision</Button>
      </Modal>
    </>
  );
}
