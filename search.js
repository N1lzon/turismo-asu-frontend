import { useState, useRef, useEffect, useCallback } from 'react';
import { BASE_URL, apiFetch } from './config';

// El backend exige al menos 2 caracteres (con menos responde 422)
export const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

// Búsqueda de lugares por nombre con debounce. Sólo se aplica la respuesta de la
// última consulta, así una respuesta lenta no pisa resultados más nuevos.
// `searched` indica si `results` corresponde a la consulta actual, para no
// mostrar "Sin resultados" mientras todavía se está escribiendo.
export function usePlaceSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const requestIdRef = useRef(0);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setSearched(false);
    if (tooShort) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      let data = [];
      try {
        const res = await apiFetch(`${BASE_URL}/places/search?q=${encodeURIComponent(trimmed)}`);
        const json = res.ok ? await res.json() : [];
        data = Array.isArray(json) ? json : [];
      } catch {
        data = [];
      }
      if (requestId !== requestIdRef.current) return;
      setResults(data);
      setLoading(false);
      setSearched(true);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, tooShort]);

  const clear = useCallback(() => setQuery(''), []);

  return { query, setQuery, results, loading, searched, tooShort, clear };
}
