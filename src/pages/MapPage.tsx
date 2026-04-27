import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import Papa from 'papaparse';
import { ArrowLeft, Loader2, Sun, Moon, LocateFixed, Trash2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { ISTANBUL_COORDS } from '../data/locations';
import { geocodeAddress, sleep } from '../utils/geocoding';
import { getMarkerIcon } from '../utils/mapIcons';
import { getCachedPlaces, setCachedPlaces, clearCache } from '../utils/cache';
import MapFilter from '../components/MapFilter';
import ErrorState from '../components/ErrorState';
import type { Place, FilterType, RawPlaceRow } from '../types';

// ─── Harita Tema URL'leri ───
const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const CSV_BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTFybZkkYn2RsnmFSaNME3WbyJkXoWU54o4hiGKUbMQ6Ijd8m_wO2nK5sRQQnd93XtQS0poQBGBXgGX/pub?output=csv';

/** YouTube video ID çıkarma */
function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return match ? match[1] : null;
}

/** Popup HTML oluşturma */
function buildPopupHtml(place: Place): string {
  let mediaHtml = '';
  if (place.mediaUrl) {
    const ytId = extractYoutubeId(place.mediaUrl);
    if (ytId) {
      mediaHtml = `<iframe width="100%" height="150" src="https://www.youtube.com/embed/${ytId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:10px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1)"></iframe>`;
    } else {
      mediaHtml = `<img src="${place.mediaUrl}" alt="${place.name}" style="width:100%;height:140px;object-fit:cover;border-radius:10px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1)" referrerPolicy="no-referrer" />`;
    }
  }

  return `
    <div style="font-family:'Inter',system-ui,sans-serif;min-width:260px;color:#1e293b">
      ${mediaHtml}
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${place.isLibrary ? '#0d9488' : '#4f46e5'}"></span>
        <span style="font-size:11px;font-weight:600;color:${place.isLibrary ? '#0d9488' : '#4f46e5'};text-transform:uppercase;letter-spacing:0.5px">${place.isLibrary ? 'Kütüphane' : 'Müze / Mekan'}</span>
      </div>
      <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:16px;font-weight:700;line-height:1.3">${place.name}</h3>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#475569">
        <div style="display:flex;align-items:flex-start;gap:6px">
          <span style="flex-shrink:0">📍</span>
          <span>${place.address}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="flex-shrink:0">📞</span>
          <span>${place.phone}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="flex-shrink:0">🕐</span>
          <span>${place.hours}</span>
        </div>
      </div>
    </div>
  `;
}

/** Tooltip HTML oluşturma */
function buildTooltipHtml(place: Place): string {
  return `
    <div style="text-align:center;font-family:'Inter',system-ui,sans-serif">
      <strong style="font-size:13px">${place.name}</strong><br/>
      <span style="font-size:11px;opacity:0.7;display:block;margin:2px 0">${place.isLibrary ? '📚 Kütüphane' : '🏛️ Müze / Mekan'}</span>
      ${place.district ? `<span style="font-size:11px;opacity:0.6">${place.district}</span>` : ''}
    </div>
  `;
}

export default function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState('Harita Yükleniyor...');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isLocating, setIsLocating] = useState(false);

  const { isDark, toggleTheme } = useTheme();

  // ─── Tema değiştiğinde harita altlığını ve ikonları güncelle ───
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstance.current) return;

    // Harita tile'ını değiştir (Dark Mode desteği)
    tileLayerRef.current.setUrl(isDark ? TILE_URLS.dark : TILE_URLS.light);

    // Marker ikonlarını güncelle
    markersRef.current.forEach((marker: any) => {
      const isLibrary = marker.options?.isLibrary ?? false;
      marker.setIcon(getMarkerIcon(isDark, isLibrary));
    });
  }, [isDark]);

  // ─── Filtre değiştiğinde markerları göster/gizle ───
  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach((marker: any) => {
      const isLibrary = marker.options?.isLibrary ?? false;
      const shouldShow =
        activeFilter === 'all' ||
        (activeFilter === 'library' && isLibrary) ||
        (activeFilter === 'museum' && !isLibrary);

      if (shouldShow) {
        if (!mapInstance.current!.hasLayer(marker)) {
          marker.addTo(mapInstance.current!);
        }
      } else {
        if (mapInstance.current!.hasLayer(marker)) {
          mapInstance.current!.removeLayer(marker);
        }
      }
    });
  }, [activeFilter]);

  // ─── CSV'den mekan verilerini çözümle ───
  const parsePlaces = useCallback(async (data: RawPlaceRow[]): Promise<Place[]> => {
    if (!data || data.length === 0) return [];

    const firstRowKeys = Object.keys(data[0] || {});
    const nameKey = firstRowKeys.find(k => k.toLowerCase().includes('adı')) || 'Adı';
    const typeKey = firstRowKeys.find(k => k.toLowerCase().includes('türü')) || 'Mekan Türü';

    const validRows = data.filter(row => row[nameKey] && row[nameKey].trim() !== '');
    const total = validRows.length;
    const results: Place[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const name = row[nameKey];
      const district = row['İlçe Adı'] || '';
      const type = row[typeKey] || '';

      const place: Place = {
        name,
        district,
        address: row['Adres'] || district,
        phone: row['Telefon'] || 'Belirtilmemiş',
        hours: row['Çalışma Saatleri'] || 'Belirtilmemiş',
        mediaUrl: row['Medya'] || '',
        type,
        isLibrary: type.toLowerCase().includes('kütüphane'),
        coords: null,
      };

      // Geocode
      const coords = await geocodeAddress(name, district);
      place.coords = coords;
      results.push(place);

      setStatus(`Harita Hazırlanıyor... (${i + 1}/${total})`);

      // Nominatim Rate Limit (sadece bilinmeyen lokasyonlar için)
      if (!coords || !(await isKnown(name))) {
        await sleep(1100);
      }
    }

    return results;
  }, []);

  // ─── Haritaya markerları ekle ───
  const addMarkersToMap = useCallback((placesData: Place[]) => {
    if (!mapInstance.current) return;

    // Eski markerları temizle
    markersRef.current.forEach(m => {
      if (mapInstance.current!.hasLayer(m)) {
        mapInstance.current!.removeLayer(m);
      }
    });
    markersRef.current = [];

    const currentIsDark = document.documentElement.classList.contains('dark');

    placesData.forEach(place => {
      if (!place.coords || !mapInstance.current) return;

      const icon = getMarkerIcon(currentIsDark, place.isLibrary);

      const marker = L.marker([place.coords.lat, place.coords.lon], {
        icon,
        isLibrary: place.isLibrary,
      } as any)
        .bindTooltip(buildTooltipHtml(place), { direction: 'top', offset: [0, -10] })
        .bindPopup(buildPopupHtml(place), { maxWidth: 320 });

      markersRef.current.push(marker);
    });

    // Tümünü haritaya ekle
    const group = L.featureGroup(markersRef.current).addTo(mapInstance.current);
    if (markersRef.current.length > 0) {
      mapInstance.current.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
  }, []);

  // ─── Harita başlatma ve veri yükleme ───
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Haritayı oluştur
    mapInstance.current = L.map(mapRef.current).setView(ISTANBUL_COORDS, 11);

    const initialUrl = isDark ? TILE_URLS.dark : TILE_URLS.light;
    tileLayerRef.current = L.tileLayer(initialUrl, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 20,
    }).addTo(mapInstance.current);

    // Önce cache'e bak
    const cached = getCachedPlaces();
    if (cached && cached.length > 0) {
      setPlaces(cached);
      addMarkersToMap(cached);
      setStatus('Yükleme Tamamlandı (Önbellekten)');
      setIsLoaded(true);
      return;
    }

    // Cache yoksa CSV'den çek
    setStatus('Veriler İndiriliyor...');
    const csvUrl = CSV_BASE_URL + '&t=' + Date.now();

    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: async function (results) {
        try {
          const parsed = await parsePlaces(results.data as RawPlaceRow[]);
          setPlaces(parsed);
          addMarkersToMap(parsed);
          setCachedPlaces(parsed);
          setStatus('Yükleme Tamamlandı');
          setIsLoaded(true);
        } catch (err) {
          console.error('Veri işleme hatası:', err);
          setHasError(true);
          setStatus('Hata!');
        }
      },
      error: function (error) {
        console.error('CSV okuma hatası:', error);
        setHasError(true);
        setStatus('Veri Çekme Hatası!');
      },
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Kullanıcı Konumu ───
  const handleLocate = useCallback(() => {
    if (!mapInstance.current || !navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latlng: [number, number] = [latitude, longitude];

        if (userMarkerRef.current) {
          mapInstance.current!.removeLayer(userMarkerRef.current);
        }

        const userIcon = L.divIcon({
          html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.2)"></div>`,
          className: 'user-location-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        userMarkerRef.current = L.marker(latlng, { icon: userIcon })
          .addTo(mapInstance.current!)
          .bindTooltip('Konumunuz', { direction: 'top', offset: [0, -14] });

        mapInstance.current!.flyTo(latlng, 14, { duration: 1.5 });
        setIsLocating(false);
      },
      (error) => {
        console.error('Konum hatası:', error);
        setIsLocating(false);
        alert('Konum alınamadı. Lütfen tarayıcı izinlerini kontrol edin.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ─── Yeniden Yükleme (Hata sonrası) ───
  const handleRetry = useCallback(() => {
    clearCache();
    window.location.reload();
  }, []);

  // ─── Sayaçlar ───
  const counts = {
    all: places.filter(p => p.coords).length,
    museum: places.filter(p => p.coords && !p.isLibrary).length,
    library: places.filter(p => p.coords && p.isLibrary).length,
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* ─── Header ─── */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 px-4 py-3 flex items-center justify-between shadow-sm z-[1000] relative transition-colors duration-500">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
            title="Ana Sayfaya Dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 m-0 leading-tight">
              İstanbul Kültür Haritası
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 hidden sm:block">
              Müzeler ve Kütüphaneler
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Durum */}
          {!isLoaded ? (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-sm font-medium border border-amber-200 dark:border-amber-800 transition-colors">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">{status}</span>
            </div>
          ) : (
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
              {counts.all} Mekan Listelendi
            </div>
          )}

          {/* Beni Bul */}
          <button
            onClick={handleLocate}
            disabled={isLocating}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-transparent dark:border-white/5"
            title="Konumumu Göster"
          >
            <LocateFixed className={`w-5 h-5 ${isLocating ? 'animate-pulse' : ''}`} />
          </button>

          {/* Önbellek Temizle */}
          {isLoaded && (
            <button
              onClick={handleRetry}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all border border-transparent dark:border-white/5"
              title="Verileri Yenile (Önbelleği Temizle)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Tema */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all border border-transparent dark:border-white/5"
            title={isDark ? 'Açık Tema' : 'Koyu Tema'}
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* ─── Map Container ─── */}
      <div className="flex-1 w-full relative z-0">
        <div ref={mapRef} className="absolute inset-0 w-full h-full" />

        {/* Filtre */}
        {isLoaded && (
          <MapFilter
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />
        )}

        {/* Hata Durumu */}
        {hasError && <ErrorState onRetry={handleRetry} />}
      </div>

      {/* ─── Global Popup/Tooltip Dark Mode CSS ─── */}
      <style>{`
        .dark .leaflet-popup-content-wrapper,
        .dark .leaflet-popup-tip {
          background: #1e293b;
          color: #f8fafc;
          border-color: #334155;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .dark .leaflet-tooltip {
          background: #1e293b;
          color: #f8fafc;
          border-color: #334155;
        }
        .dark .leaflet-tooltip::before {
          border-top-color: #1e293b;
        }
        .dark .leaflet-popup-content h3 {
          color: #818cf8 !important;
        }
        .dark .leaflet-popup-content div {
          color: #cbd5e1 !important;
        }
        .dark .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .dark .leaflet-popup-close-button:hover {
          color: #f8fafc !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          padding: 4px !important;
        }
        .leaflet-tooltip {
          border-radius: 12px !important;
          padding: 8px 12px !important;
          font-size: 13px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .custom-marker div:hover {
          transform: scale(1.15) !important;
        }
        .user-location-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}

/** knownLocations'ta var mı kontrol et (import döngüsünü önlemek için burada) */
async function isKnown(name: string): Promise<boolean> {
  const { knownLocations } = await import('../data/locations');
  return name in knownLocations;
}
