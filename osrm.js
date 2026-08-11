export const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// Tope de espera: el OSRM público a veces tarda y no debe colgar la pantalla
const TIMEOUT_MS = 6000;

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Devuelve { geometry, distanceMeters, legs } de la ruta que pasa por los puntos
// dados ({ lat, lng }), o null si OSRM no responde o hay menos de dos puntos.
// `legs[i]` es el tramo entre el punto i y el i+1.
export async function fetchRoute(points, { overview = 'simplified' } = {}) {
  const valid = points.filter((p) => p.lat != null && p.lng != null);
  if (valid.length < 2) return null;

  const coordStr = valid.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/${coordStr}?overview=${overview}&geometries=geojson`;

  try {
    const data = await Promise.race([
      fetch(url).then((res) => res.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('osrm timeout')), TIMEOUT_MS)),
    ]);
    const found = data.routes?.[0];
    if (!found?.geometry?.coordinates) return null;
    return {
      geometry: found.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      distanceMeters: found.distance ?? null,
      legs: (found.legs ?? []).map((leg) => ({ distanceMeters: leg.distance ?? 0 })),
    };
  } catch {
    return null;
  }
}

// Trazado recto entre puntos, para cuando OSRM no responde: se pierde el detalle
// de las calles pero las pantallas siguen mostrando algo coherente
export function straightLineRoute(points) {
  const legs = points.slice(1).map((p, i) => ({
    distanceMeters: haversineMeters(points[i].lat, points[i].lng, p.lat, p.lng),
  }));
  return {
    geometry: points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    distanceMeters: legs.reduce((acc, leg) => acc + leg.distanceMeters, 0),
    legs,
  };
}

// fetchRoute con el fallback recto ya aplicado. null si hay menos de dos puntos.
export async function fetchRouteOrStraight(points, options) {
  const valid = points.filter((p) => p.lat != null && p.lng != null);
  if (valid.length < 2) return null;
  return (await fetchRoute(valid, options)) ?? straightLineRoute(valid);
}
