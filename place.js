// Utilidades compartidas para lugares y eventos (horarios, fotos, distancias)

// Las claves de opening_hours vienen en español desde el backend
const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const CLOSED = 'Cerrado';
const ALL_DAY = '24 horas';

function hoursForDay(place, dayIndex) {
  return place.opening_hours?.[DAYS_ES[dayIndex]]?.trim() ?? null;
}

// "HH:MM - HH:MM" -> { open, close } en minutos desde medianoche, o null
function parseRange(hours) {
  const parts = hours?.split('-').map((s) => s.trim());
  if (parts?.length !== 2) return null;
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
  };
  const open = toMinutes(parts[0]);
  const close = toMinutes(parts[1]);
  return Number.isNaN(open) || Number.isNaN(close) ? null : { open, close };
}

// Un tramo cuyo cierre no es posterior a la apertura termina al día siguiente
const crossesMidnight = (range) => range.close <= range.open;

export function getTodayHours(place) {
  return hoursForDay(place, new Date().getDay());
}

// true/false si se puede determinar, null si no hay datos
export function isOpen(place, now = new Date()) {
  if (!place.opening_hours) return null;
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();

  // Madrugada dentro del horario de ayer (p. ej. un bar de 18:00 a 02:00)
  const yesterday = parseRange(hoursForDay(place, (day + 6) % 7));
  if (yesterday && crossesMidnight(yesterday) && minutes < yesterday.close) return true;

  const today = hoursForDay(place, day);
  if (today == null) return null;
  if (today === CLOSED) return false;
  if (today === ALL_DAY) return true;

  const range = parseRange(today);
  if (!range) return null;
  if (crossesMidnight(range)) return minutes >= range.open;
  return minutes >= range.open && minutes < range.close;
}

// Texto del horario de hoy listo para mostrar, o null si no hay nada que mostrar
export function formatTodayHours(place, t) {
  const today = getTodayHours(place);
  if (!today || today === CLOSED) return null;
  if (today === ALL_DAY) return t('open_24h');
  return t('hours_range', { h: today });
}

export function getPhoto(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
  if (typeof item.photo === 'string') return item.photo;
  return null;
}

export function formatDistance(meters, t) {
  if (meters == null) return null;
  return meters < 1000
    ? t('dist_meters', { n: Math.round(meters) })
    : t('dist_km', { n: (meters / 1000).toFixed(1) });
}

// --- Eventos ---

// "YYYY-MM-DD" -> Date local (sin desfase de zona horaria)
function parseLocalDate(ymd) {
  const [y, m, d] = (ymd ?? '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isUpcomingEvent(event) {
  const date = parseLocalDate(event.date);
  return date == null || date >= startOfToday();
}

const LOCALES = { es: 'es-PY', en: 'en-US', pt: 'pt-BR' };

// "Hoy", "Mañana" o p. ej. "sáb, 10 de may."
export function formatEventDate(ymd, t, language) {
  const date = parseLocalDate(ymd);
  if (!date) return ymd ?? '';
  const diffDays = Math.round((date - startOfToday()) / 86400000);
  if (diffDays === 0) return t('today');
  if (diffDays === 1) return t('tomorrow');
  try {
    const text = date.toLocaleDateString(LOCALES[language] ?? 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch {
    return ymd;
  }
}

export function formatEventTime(event, t) {
  const start = event.start_time?.slice(0, 5);
  const end = event.end_time?.slice(0, 5);
  if (!start) return null;
  return t('hours_range', { h: end ? `${start} – ${end}` : start });
}
