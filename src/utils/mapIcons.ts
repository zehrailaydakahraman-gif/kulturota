import L from 'leaflet';

// Leaflet varsayılan ikon yollarını düzeltme
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ICON_SIZE: [number, number] = [32, 32];
const ICON_ANCHOR: [number, number] = [16, 32];
const POPUP_ANCHOR: [number, number] = [0, -32];
const TOOLTIP_ANCHOR: [number, number] = [0, -36];

function createSvgIcon(bgColor: string, borderColor: string, svgPath: string, shadowOpacity: number = 0.2): L.DivIcon {
  return L.divIcon({
    html: `<div style="background-color:${bgColor};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid ${borderColor};box-shadow:0 4px 6px rgba(0,0,0,${shadowOpacity});transition:transform .2s">${svgPath}</div>`,
    className: 'custom-marker',
    iconSize: ICON_SIZE,
    iconAnchor: ICON_ANCHOR,
    popupAnchor: POPUP_ANCHOR,
    tooltipAnchor: TOOLTIP_ANCHOR,
  });
}

const MUSEUM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`;

const LIBRARY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;

// ─── Müze İkonları ───
export const museumIconLight = createSvgIcon('#4f46e5', 'white', MUSEUM_SVG);
export const museumIconDark = createSvgIcon('#818cf8', '#1e1e2f', MUSEUM_SVG, 0.4);

// ─── Kütüphane İkonları ───
export const libraryIconLight = createSvgIcon('#0d9488', 'white', LIBRARY_SVG);
export const libraryIconDark = createSvgIcon('#2dd4bf', '#1e1e2f', LIBRARY_SVG, 0.4);

/** Tema ve mekan tipine göre doğru ikonu döndürür */
export function getMarkerIcon(isDark: boolean, isLibrary: boolean): L.DivIcon {
  if (isLibrary) {
    return isDark ? libraryIconDark : libraryIconLight;
  }
  return isDark ? museumIconDark : museumIconLight;
}
