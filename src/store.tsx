"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { State, Trip, Catalog, Weather } from "./lib/types";
import { api } from "./lib/utils";
const Context = createContext<{
  state: State | null;
  trip: Trip | undefined;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  mutate: <T = unknown>(
    path: string,
    body: unknown,
    message?: string,
  ) => Promise<T>;
  city: string;
  setCity: (city: string) => void;
  catalog: Catalog;
  weather: Weather | null;
  refreshWeather: () => void;
} | null>(null);
const emptyCatalog: Catalog = {
  places: [],
  stays: [],
  restaurants: [],
  experiences: [],
};
export function YatraProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState("Delhi");
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [weather, setWeather] = useState<Weather | null>(null);
  const seenNotices = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!state) return;
    const fresh = state.notifications.filter(
      (n) => !n.read && !seenNotices.current?.has(n.id),
    );
    if (
      seenNotices.current &&
      state.profile.notifications &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      for (const notice of fresh) {
        try {
          new Notification(notice.title, {
            body: notice.message,
            tag: notice.id,
          });
        } catch {}
      }
    }
    seenNotices.current = new Set(state.notifications.map((n) => n.id));
  }, [state]);
  const refresh = useCallback(async () => {
    try {
      const s = await api<State>("state");
      setState(s);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    let valid = true;
    setCatalog(emptyCatalog);
    api<Catalog>("catalog?city=" + encodeURIComponent(city))
      .then((x) => {
        if (valid) setCatalog(x);
      })
      .catch(() => {});
    return () => {
      valid = false;
    };
  }, [city]);
  const refreshWeather = useCallback(() => {
    api<Weather>("weather?city=" + encodeURIComponent(city))
      .then(setWeather)
      .catch(() => setWeather(null));
  }, [city]);
  useEffect(() => {
    if (!state) return;
    refreshWeather();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshWeather();
    }, 15 * 60000);
    return () => clearInterval(timer);
  }, [refreshWeather, !!state]);
  const mutate = useCallback(
    async <T,>(path: string, body: unknown, message?: string) => {
      try {
        const data = await api<T>(path, body);
        await refresh();
        if (message) toast.success(message);
        return data;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      }
    },
    [refresh],
  );
  const trip =
    state?.trips.find((t) => t.id === state.activeTripId) || state?.trips[0];
  return (
    <Context.Provider
      value={{
        state,
        trip,
        loading,
        error,
        refresh,
        mutate,
        city,
        setCity,
        catalog,
        weather,
        refreshWeather,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useYatra() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing app context");
  return context;
}
