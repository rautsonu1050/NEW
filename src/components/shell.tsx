/**
 * Shell Component
 *
 * Handles UI rendering and state management for the shell feature.
 */
"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  House,
  Map,
  Ticket,
  Sparkles,
  BriefcaseBusiness,
  BookOpen,
  User,
  MapPin,
  Search,
  Bell,
  Sun,
  ChevronDown,
  ArrowUpRight,
  Headphones,
  ScanLine,
  Wallet,
  LifeBuoy,
  LayoutDashboard,
  Store,
  ChartNoAxesCombined,
  Plug,
  PanelLeft,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { useYatra } from "../store";
import { cities } from "../data/cities";
import type { Role } from "../lib/types";
const traveler = [
  ["Home", "/", House],
  ["My Trips", "/traveler/trips", Map],
  ["Explore India", "/explore", Compass],
  ["Stays & Bookings", "/bookings", Ticket],
  ["AI Assistant", "/assistant", Sparkles],
] as const;
const tools = [
  ["Travel Toolkit", "/travel-toolkit", BriefcaseBusiness],
  ["Heritage Passport", "/passport", BookOpen],
  ["Budget & Expenses", "/budget", Wallet],
] as const;
const business = [
  ["Dashboard", "/business", LayoutDashboard],
  ["My Offers", "/business/offers", Ticket],
  ["Register Business", "/business/register", Store],
] as const;
const admin = [
  ["Overview", "/admin", LayoutDashboard],
  ["Partner Verification", "/admin/businesses", ShieldCheck],
  ["Tourism Analytics", "/admin/analytics", ChartNoAxesCombined],
  ["Integrations", "/admin/integrations", Plug],
] as const;
/** Renders the Logo view. */
export function Logo() {
  return (
    <Link href="/" className="brand">
      <span className="brand-icon">
        <Compass size={25} strokeWidth={1.7} />
      </span>
      <span>
        YATRA<span className="brand-ai"> AI</span>
        <small>EVERY JOURNEY, CONNECTED</small>
      </span>
    </Link>
  );
}
/** Renders the Shell view. */
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { state, mutate, city, setCity, weather } = useYatra();
  const [search, setSearch] = useState("");
  const role = state?.role || "traveler";
  const main =
    role === "business"
      ? business
      : role === "admin" || role === "authority"
        ? admin
        : traveler;
  const unread = state?.notifications.filter((n) => !n.read).length || 0;
  const name = state?.profile.name.split(" ")[0] || "Traveler";
  const changeRole = async (role: Role) => {
    try {
      await mutate("role", { role });
      router.push(
        role === "business"
          ? "/business"
          : role === "admin" || role === "authority"
            ? "/admin"
            : "/",
      );
    } catch {}
  };
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "238px" } as React.CSSProperties}
    >
      <Sidebar className="yatra-sidebar" collapsible="icon">
        <SidebarHeader className="sidebar-brand">
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              {role === "traveler"
                ? "YOUR JOURNEY"
                : role === "business"
                  ? "BUSINESS PORTAL"
                  : "TOURISM MANAGEMENT"}
            </SidebarGroupLabel>
            <SidebarMenu>
              {main.map(([title, href, Icon]) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      path === href ||
                      (href !== "/" &&
                        path.startsWith(href) &&
                        href !== "/business" &&
                        href !== "/admin")
                    }
                    tooltip={title}
                    className="nav-button"
                  >
                    <Link href={href}>
                      <Icon size={19} />
                      <span>{title}</span>
                      {title === "AI Assistant" && (
                        <span className="new-tag">AI</span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          {role === "traveler" && (
            <SidebarGroup>
              <SidebarGroupLabel>EXPLORE MORE</SidebarGroupLabel>
              <SidebarMenu>
                {tools.map(([title, href, Icon]) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={path === href}
                      tooltip={title}
                      className="nav-button"
                    >
                      <Link href={href}>
                        <Icon size={19} />
                        <span>{title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
          <div className="sidebar-help">
            <div className="mini-icon purple">
              <Sparkles size={20} />
            </div>
            <h3>A little help, wherever you are.</h3>
            <p>Your travel companion is one tap away.</p>
            <Link href="/assistant">
              Ask YATRA AI <ArrowUpRight size={16} />
            </Link>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="nav-button">
                <Link href="/profile">
                  <User size={19} />
                  <span>My Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="nav-button">
                <Link href="/profile?sos=1">
                  <LifeBuoy size={19} />
                  <span>Help & Safety</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="sidebar-note">Made for the way you travel.</div>
        </SidebarFooter>
      </Sidebar>
      <div className="app-body">
        <header className="topbar">
          <div className="header-left">
            <SidebarTrigger className="nav-toggle" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="location-button">
                  <MapPin size={18} />
                  <span>{city}, India</span>
                  <ChevronDown size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {cities.map((c) => (
                  <DropdownMenuItem
                    key={c.name}
                    onClick={() => setCity(c.name)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <form
              className="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push("/explore?q=" + encodeURIComponent(search));
              }}
            >
              <Search size={17} />
              <input
                aria-label="Search destinations and places"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="A place, a feeling, a new adventure..."
              />
              <kbd>↵</kbd>
            </form>
          </div>
          <div className="header-actions">
            <span className="header-weather">
              <Sun size={19} />
              {weather?.temp ?? "--"}°C{" "}
              <small>
                {weather?.source.status === "demo"
                  ? "sample"
                  : weather?.source.status || ""}
              </small>
            </span>
            <Link
              href="/notifications"
              className="notification-button"
              aria-label={`Notifications, ${unread} unread`}
            >
              <Bell size={20} />
              {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="user-menu">
                  <span className="avatar">{name.slice(0, 1)}</span>
                  <div>
                    {name}
                    <small>
                      {state?.demo ? "Demo · " : ""}
                      {role === "authority"
                        ? "Tourism Authority"
                        : role.charAt(0).toUpperCase() + role.slice(1)}
                    </small>
                  </div>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {state?.demo ? "Explore demo roles" : "Your account"}
                </DropdownMenuLabel>
                {state?.demo &&
                  (
                    ["traveler", "business", "admin", "authority"] as Role[]
                  ).map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => void changeRole(r)}
                    >
                      {r === "authority"
                        ? "Tourism Authority"
                        : r.charAt(0).toUpperCase() + r.slice(1)}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  Profile & preferences
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/login")}>
                  {state?.demo ? "Sign in to your account" : "Account sign-in"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="workspace" id="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>
            YATRA AI <span>·</span> Thoughtful journeys across India
          </span>
          <Link href="/profile?sos=1">
            Travel with care <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {(role === "traveler"
          ? [...traveler.slice(0, 4), ["Profile", "/profile", User] as const]
          : main
        ).map(([label, href, Icon]) => (
          <Link
            key={href}
            href={href}
            className={path === href ? "active" : ""}
          >
            <Icon size={21} />
            <span>
              {label === "Stays & Bookings"
                ? "Bookings"
                : label === "Explore India"
                  ? "Explore"
                  : label}
            </span>
          </Link>
        ))}
      </nav>
      <Toaster position="bottom-right" richColors closeButton />
    </SidebarProvider>
  );
}
