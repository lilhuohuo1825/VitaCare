/**
 * Bản đồ vector (MapLibre) — chọn một provider free tier:
 * - MapTiler: https://www.maptiler.com/cloud/ → API key
 * - Mapbox: https://account.mapbox.com/ → Default public token
 *
 * Dán key vào MAP_TILES_API_KEY và chọn MAP_STYLE_PROVIDER phù hợp.
 */
export type MapStyleProvider = 'maptiler' | 'mapbox';

export const MAP_STYLE_PROVIDER: MapStyleProvider = 'maptiler';

/** Key MapTiler hoặc Mapbox (tuỳ MAP_STYLE_PROVIDER) */
export const MAP_TILES_API_KEY = '';

export function isMapTilesConfigured(): boolean {
  return MAP_TILES_API_KEY.trim().length > 0;
}

export function buildVectorStyleUrl(): string {
  const key = MAP_TILES_API_KEY.trim();
  if (!key) return '';
  if (MAP_STYLE_PROVIDER === 'maptiler') {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`;
  }
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${encodeURIComponent(key)}`;
}
