/**
 * Shared Component
 *
 * Handles UI rendering and state management for the shared feature.
 */
"use client";
import {
  useId,
  useState,
  useEffect,
  type ReactNode,
  type ComponentType,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  MapPin,
  Heart,
  Star,
  Compass,
  Check,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import type { Place, Provenance } from "../lib/types";
import { cities } from "../data/cities";
import { money } from "../lib/utils";
import { useYatra } from "../store";
/** Renders the Button view. */
export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  busy = false,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled || busy}
    >
      {busy && <Loader2 className="spin" size={17} />} {children}
    </button>
  );
}
/** Renders the LinkButton view. */
export function LinkButton({
  href,
  children,
  secondary = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`btn btn-${secondary ? "secondary" : "primary"} ${className}`}
    >
      {children}
    </Link>
  );
}
/** Renders the SelectField view. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { label: string; value: string })[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={"field " + className}>
      {label && <label htmlFor={id}>{label}</label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-label={label || "Choose an option"}
          className="select-control"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => {
            const value = typeof o === "string" ? o : o.value;
            return (
              <SelectItem key={value} value={value}>
                {typeof o === "string" ? o : o.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
/** Renders the CityPicker view. */
export function CityPicker({
  label,
  value,
  onChange,
  origin = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  origin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const list = [
    ...cities.map((c) => c.name),
    ...(origin
      ? ["Bengaluru", "Kolkata", "Chennai", "Hyderabad", "Pune", "Ahmedabad"]
      : []),
  ];
  return (
    <div className="field">
      <label>{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={label} className="city-trigger">
            <MapPin size={16} />
            <span>{value || "Choose city"}</span>
            <ChevronDown size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64">
          <Command>
            <CommandInput
              placeholder="Search a city..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No local catalog for this city yet.</CommandEmpty>
              {list.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                >
                  <MapPin size={14} />
                  {c}
                  {value === c && <Check size={14} className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
/** Renders the Modal view. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className={"yatra-modal " + (wide ? "modal-wide" : "")}>
        <DialogTitle className="modal-title">{title}</DialogTitle>
        <DialogDescription className={description ? "muted" : "sr-only"}>
          {description || title}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
/** Renders the Confirm view. */
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction className="btn-danger" onClick={onConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
/** Renders the TabBar view. */
export function TabBar({
  value,
  onChange,
  options,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  children?: ReactNode;
}) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="tabbar" variant="line">
        {options.map((o) => (
          <TabsTrigger value={o} key={o}>
            {o}
          </TabsTrigger>
        ))}
      </TabsList>
      {children || options.map((o) => <TabsContent value={o} key={o} />)}
    </Tabs>
  );
}
/** Renders the CheckOption view. */
export function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={"check-option " + (checked ? "selected" : "")}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
/** Renders the Photo view. */
export function Photo({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed || !src ? (
    <div className={"photo-fallback " + className} role="img" aria-label={alt}>
      <MapPin size={28} />
      <span>{alt}</span>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
/** Renders the PageTitle view. */
export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
/** Renders the SectionTitle view. */
export function SectionTitle({
  title,
  subtitle,
  href,
  action = "View all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href}>
          {action}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
/** Renders the SourceBadge view. */
export function SourceBadge({
  source,
  compact = false,
}: {
  source: Provenance;
  compact?: boolean;
}) {
  return (
    <span
      className={`source-badge source-${source.status}`}
      title={`${source.provider}. ${source.message || ""}${source.retrievedAt ? " Retrieved " + new Date(source.retrievedAt).toLocaleString() : ""}`}
    >
      {source.status === "demo"
        ? "Demo data"
        : source.status === "cached"
          ? "Cached"
          : source.status === "unavailable"
            ? "Unavailable"
            : "Live"}
      {!compact && " · " + source.provider}
    </span>
  );
}
/** Renders the Empty view. */
export function Empty({
  title,
  description,
  href,
  action = "Plan a journey",
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Compass size={32} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {href && (
        <LinkButton href={href}>
          {action}
          <ArrowRight size={16} />
        </LinkButton>
      )}
    </div>
  );
}
/** Renders the Loading view. */
export function Loading() {
  return (
    <div className="loading-page" aria-label="Loading">
      <Skeleton className="h-9 w-60" />
      <Skeleton className="h-64 w-full rounded-3xl" />
      <div className="grid-three">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
/** Renders the Stat view. */
export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  color = "purple",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ComponentType<{ size?: number }>;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        {Icon && (
          <div className={"mini-icon " + color}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <strong>{value}</strong>
      {sub && <p>{sub}</p>}
    </div>
  );
}
/** Renders the Meter view. */
export function Meter({
  label,
  value,
  color = "purple",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className={"meter " + color}>
      <div>
        <span>{label}</span>
        <b>{value}%</b>
      </div>
      <Progress value={Math.max(0, Math.min(100, value))} />
    </div>
  );
}
/** Renders the PlaceCard view. */
export function PlaceCard({ place }: { place: Place }) {
  const { state, mutate } = useYatra();
  const saved = state?.favorites.includes(place.id);
  return (
    <article className="place-card">
      <Link href={"/places/" + place.id} className="place-image">
        <Photo src={place.image} alt={place.city + " destination photograph"} />
        {place.hidden ? (
          <span className="image-pill">Hidden gem</span>
        ) : (
          <span className="image-pill">
            <Sparkles size={12} />
            For your journey
          </span>
        )}
      </Link>
      <button
        className={"favorite " + (saved ? "is-saved" : "")}
        aria-label={(saved ? "Unsave " : "Save ") + place.name}
        onClick={() =>
          void mutate("favorites", { id: place.id }).catch(() => {})
        }
      >
        <Heart size={17} fill={saved ? "currentColor" : "none"} />
      </button>
      <div className="place-body">
        <div className="place-category">
          {place.category}
          <span>
            <Star size={12} fill="currentColor" />
            {place.rating}
          </span>
        </div>
        <Link href={"/places/" + place.id}>
          <h3>{place.name.split(" (")[0]}</h3>
        </Link>
        <p>
          <MapPin size={13} />
          {place.city}, India
        </p>
        <div className="place-bottom">
          <span>
            {place.cost ? money(place.cost) : "Free entry"}
            <small> / person, sample</small>
          </span>
          <ArrowRight size={16} />
        </div>
      </div>
    </article>
  );
}
