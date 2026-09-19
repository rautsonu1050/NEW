import raw from "../data/catalog.json";
import type { Catalog, Place, Stay } from "../lib/types";
import { cities } from "../data/cities";
const catalog: Catalog = raw;
export const allPlaces = catalog.places;
export function getCatalog(city: string): Catalog {
  return {
    places: catalog.places.filter((p) => p.city === city),
    stays: catalog.stays.filter((p) => p.city === city),
    restaurants: catalog.restaurants.filter((p) => p.city === city),
    experiences: catalog.experiences.filter((p) => p.city === city),
  };
}
export const placeById = (id: string) => allPlaces.find((p) => p.id === id);
export const stayById = (id: string) => catalog.stays.find((p) => p.id === id);
export const experienceById = (id: string) =>
  catalog.experiences.find((p) => p.id === id);
export function scorePlace(
  p: Place,
  prefs: { interests: string[]; budget: number },
  near?: { lat: number; lng: number },
) {
  const preference = p.interests.filter((i) =>
    prefs.interests.includes(i),
  ).length;
  return Math.min(
    99,
    Math.round(
      50 +
        p.rating * 5 +
        preference * 6 +
        (p.cost < 100 ? 8 : 0) +
        (p.hidden ? 3 : 0),
    ),
  );
}
export function scoreStay(
  p: Stay,
  budget: number,
  access: string[],
  food: string,
) {
  return Math.min(
    99,
    Math.round(
      45 +
        p.rating * 5 +
        (p.price <= budget ? 14 : 0) +
        (access.length && p.lift ? 7 : 0) +
        (food.includes("Veg") && p.veg ? 7 : 0),
    ),
  );
}
export { cities };
