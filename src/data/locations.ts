export const ISTANBUL_COORDS: [number, number] = [41.0082, 28.9784];

// Known locations for fast geocoding fallback (partial list, can be extended)
export const knownLocations: Record<string, { lat: number; lon: number }> = {
  // Museums
  "Anadolu Hisarı Müzesi": { lat: 41.0822, lon: 29.0673 },
  "Artİstanbul Feshane": { lat: 41.0461, lon: 28.9351 },
  "Aşiyan Müzesi": { lat: 41.0815, lon: 29.0555 },
  "Atatürk Müzesi": { lat: 41.0581, lon: 28.9873 },
  // Libraries (example subset)
  "Atatürk Kitaplığı (Merkez Kütüphane)": { lat: 41.032768, lon: 28.967636 },
  "Kadın Eserleri Kütüphanesi": { lat: 41.004513, lon: 28.977416 },
  // Add more entries as needed
};
