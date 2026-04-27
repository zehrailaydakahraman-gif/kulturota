import type { Place, CachedData } from '../types';

const CACHE_KEY = 'kulturota_places_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 saat

/**
 * Önbelleğe mekan verilerini kaydeder.
 */
export function setCachedPlaces(places: Place[]): void {
  try {
    const data: CachedData = {
      places,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Cache yazma hatası (localStorage dolu olabilir):', e);
  }
}

/**
 * Önbellekten verileri okur. Süresi dolmuşsa veya yoksa null döner.
 */
export function getCachedPlaces(): Place[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const data: CachedData = JSON.parse(raw);
    const age = Date.now() - data.timestamp;

    if (age > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data.places;
  } catch {
    return null;
  }
}

/** Önbelleği manuel temizler */
export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
