import { useEffect, useState } from "react";
import { distanceMatrix, haversineKm, type DistanceResult, type LatLng } from "@/lib/google-maps";

export type Eta = {
  km: number;
  kmText: string;
  etaText: string;
  source: "google" | "haversine";
};

/**
 * Real driving distance + ETA for a list of destinations from a single origin.
 * Falls back to haversine straight-line if Google API is unavailable / denied.
 * Results are cached in localStorage (5 min TTL) inside `distanceMatrix`.
 */
export function useDistanceMatrix(origin: LatLng | null, destinations: LatLng[]): Eta[] {
  const [results, setResults] = useState<Eta[]>(() =>
    destinations.map(() => ({ km: 0, kmText: "—", etaText: "—", source: "haversine" })),
  );

  useEffect(() => {
    if (!origin || destinations.length === 0) return;
    let cancel = false;

    // Always seed with haversine immediately so UI is never blank.
    const seed = destinations.map<Eta>((d) => {
      const km = haversineKm(origin, d);
      return {
        km,
        kmText: `${km.toFixed(1)} km`,
        etaText: `${Math.max(2, Math.round((km / 25) * 60))} min`,
        source: "haversine",
      };
    });
    setResults(seed);

    (async () => {
      const dm = await distanceMatrix(origin, destinations);
      if (cancel) return;
      const next = seed.map<Eta>((s, i) => {
        const r: DistanceResult | null = dm[i];
        if (!r) return s;
        return {
          km: r.distanceMeters / 1000,
          kmText: r.distanceText,
          etaText: r.durationText,
          source: "google",
        };
      });
      setResults(next);
    })();

    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, JSON.stringify(destinations.map((d) => [d.lat, d.lng]))]);

  return results;
}
