export const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// Tope de espera: el OSRM público a veces tarda y no debe colgar la pantalla
const TIMEOUT_MS = 6000;

// Devuelve { geometry, distanceMeters } de la ruta que pasa por los puntos
// dados ({ lat, lng }), o null si OSRM no responde o hay menos de dos puntos.
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
    };
  } catch {
    return null;
  }
}
