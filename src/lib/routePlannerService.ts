import { ScrapedProspect } from "./scraperService";

export interface RouteStop {
  prospectId: string;
  order: number;
  prospect: ScrapedProspect;
  distanceFromPreviousKm?: number;
  durationFromPreviousMin?: number;
  visitedStatus: 'pending' | 'visited' | 'proposal_delivered' | 'absent' | 'rejected';
  notes?: string;
}

export interface VisitRoutePlan {
  id: string;
  createdAt: string;
  name: string;
  originAddress: string;
  originCoords: { lat: number; lng: number };
  destinationAddress: string;
  destinationCoords: { lat: number; lng: number };
  travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING';
  stops: RouteStop[];
  totalDistanceKm: number;
  totalDurationMin: number;
  googleMapsNavigationUrl: string;
}

const STORAGE_KEY = 'creapp_visit_route_plan_v1';

/**
 * Recupera la ruta activa guardada
 */
export const getStoredVisitRoute = (): VisitRoutePlan | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error leyendo ruta de visitas de localStorage:", e);
  }
  return null;
};

/**
 * Guarda la ruta en localStorage
 */
export const saveStoredVisitRoute = (route: VisitRoutePlan | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (route) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(route));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn("Error guardando ruta de visitas en localStorage:", e);
  }
};

/**
 * Distancia Haversine en Km entre dos puntos geográficos
 */
export const calculateDistanceKm = (
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

/**
 * Genera el enlace universal de Google Maps con múltiples paradas para abrir directo en la App del teléfono
 */
export const buildGoogleMapsMultiStopUrl = (
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  waypoints: Array<{ lat: number; lng: number } | string>,
  travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING' = 'DRIVING'
): string => {
  const formatPoint = (p: { lat: number; lng: number } | string) => {
    if (typeof p === 'string') return encodeURIComponent(p);
    return `${p.lat},${p.lng}`;
  };

  const originStr = formatPoint(origin);
  const destStr = formatPoint(destination);
  const wpStr = waypoints.map(formatPoint).join('|');

  const modeParam =
    travelMode === 'WALKING'
      ? '&travelmode=walking'
      : travelMode === 'BICYCLING'
      ? '&travelmode=bicycling'
      : '&travelmode=driving';

  return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${wpStr}${modeParam}`;
};

/**
 * Ordena heurísticamente una lista de prospectos por cercanía (Vecino más cercano)
 * desde el origen hacia el destino para maximizar la eficiencia del trayecto.
 */
export const optimizeStopsByProximity = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  prospects: ScrapedProspect[],
  travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING' = 'DRIVING'
): RouteStop[] => {
  const validProspects = prospects.filter(
    (p) => typeof p.lat === 'number' && typeof p.lng === 'number'
  );

  const remaining = [...validProspects];
  const ordered: ScrapedProspect[] = [];
  let currentPos = origin;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      const dist = calculateDistanceKm(currentPos, { lat: p.lat!, lng: p.lng! });
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextProspect = remaining.splice(nearestIndex, 1)[0];
    ordered.push(nextProspect);
    currentPos = { lat: nextProspect.lat!, lng: nextProspect.lng! };
  }

  // Estimar tiempos y distancias entre cada tramo
  // Velocidades promedio en ciudad: Auto 25 km/h, Bici 16 km/h, Caminando 4.5 km/h
  const avgSpeedKmH = travelMode === 'WALKING' ? 4.5 : travelMode === 'BICYCLING' ? 16 : 25;
  let prevPos = origin;

  return ordered.map((prospect, idx) => {
    const pCoords = { lat: prospect.lat!, lng: prospect.lng! };
    const distKm = calculateDistanceKm(prevPos, pCoords);
    const durationMin = Math.max(2, Math.round((distKm / avgSpeedKmH) * 60));
    prevPos = pCoords;

    return {
      prospectId: prospect.id,
      order: idx + 1,
      prospect,
      distanceFromPreviousKm: distKm,
      durationFromPreviousMin: durationMin,
      visitedStatus: 'pending',
    };
  });
};
