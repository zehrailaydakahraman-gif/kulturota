import type { Coordinates } from '../types';
import { knownLocations } from '../data/locations';

/** Belirli bir süre bekler (Rate Limit için) */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verilen mekan adı ve ilçe bilgisiyle koordinat döndürür.
 * Önce knownLocations'a bakar, bulamazsa Nominatim API'ye sorgu atar.
 * Nominatim de bulamazsa ilçe bazlı fallback yapar.
 */
export async function geocodeAddress(name: string, district: string): Promise<Coordinates | null> {
  // 1) Önce sabit listeden bak
  if (knownLocations[name]) {
    return knownLocations[name];
  }

  // 2) Nominatim API'ye sor (isim bazlı)
  const nameQuery = `${name}, İstanbul`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nameQuery)}&limit=1`;

  try {
    const response = await fetch(url, { headers: { 'Accept-Language': 'tr' } });
    const data = await response.json();

    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }

    // 3) İsim bulunamadıysa ilçe bazlı fallback
    await sleep(1000);
    const districtQuery = `${district}, İstanbul`;
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(districtQuery)}&limit=1`;
    const fallbackResponse = await fetch(fallbackUrl, { headers: { 'Accept-Language': 'tr' } });
    const fallbackData = await fallbackResponse.json();

    if (fallbackData && fallbackData.length > 0) {
      // İlçe merkezinden hafif sapma ekle (üst üste binmeyi önlemek için)
      const offsetLat = (Math.random() - 0.5) * 0.020;
      const offsetLon = (Math.random() - 0.5) * 0.020;
      return {
        lat: parseFloat(fallbackData[0].lat) + offsetLat,
        lon: parseFloat(fallbackData[0].lon) + offsetLon,
      };
    }
  } catch (error) {
    console.error('Geocoding hatası:', error);
  }

  return null;
}
