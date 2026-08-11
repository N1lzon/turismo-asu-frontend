// Formatea metros como "3,2 km". Coma decimal salvo en inglés.
export function formatKm(meters, language) {
  if (meters == null) return null;
  const km = (meters / 1000).toFixed(1);
  return `${language === 'en' ? km : km.replace('.', ',')} km`;
}
