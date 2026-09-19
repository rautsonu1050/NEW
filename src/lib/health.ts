import type { Trip, Incident } from "./types";
export function health(trip: Trip, incident?: Incident) {
  const scheduleScore = incident
    ? Math.max(25, 100 - incident.delay * 0.6)
    : 95;
  const budgetScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((trip.preferences.budget - trip.emergency) /
          Math.max(1, trip.estimate)) *
          90,
      ),
    ),
  );
  const weather = incident?.type === "Heavy rain" ? 35 : 85;
  const route = trip.days.flatMap((d) => d.items).some((x) => x.distance > 25)
    ? 65
    : 90;
  const accessibility = trip.preferences.accessibility.length ? 65 : 90;
  return {
    schedule: Math.round(scheduleScore),
    budget: budgetScore,
    weather,
    route,
    accessibility,
    crowd: 70,
    overall: Math.round(
      (scheduleScore + budgetScore + weather + route + accessibility + 70) / 6,
    ),
  };
}
