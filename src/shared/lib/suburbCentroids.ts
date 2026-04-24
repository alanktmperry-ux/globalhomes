// Static fallback centroids for major AU suburbs (used when Google Geocoding API
// is unavailable). Coordinates are approximate suburb centers (WGS84).
// Keep keys lowercase. Match by suburb name only — state is ignored.

export const SUBURB_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Melbourne / VIC
  melbourne: { lat: -37.8136, lng: 144.9631 },
  'melbourne cbd': { lat: -37.8136, lng: 144.9631 },
  prahran: { lat: -37.8513, lng: 144.9956 },
  toorak: { lat: -37.8417, lng: 145.0153 },
  'south yarra': { lat: -37.8389, lng: 144.9925 },
  windsor: { lat: -37.8567, lng: 144.9928 },
  'st kilda': { lat: -37.8675, lng: 144.9806 },
  'st kilda east': { lat: -37.8689, lng: 144.9947 },
  'st kilda west': { lat: -37.8581, lng: 144.9728 },
  richmond: { lat: -37.8197, lng: 145.0006 },
  fitzroy: { lat: -37.7986, lng: 144.9789 },
  'fitzroy north': { lat: -37.7842, lng: 144.9783 },
  collingwood: { lat: -37.8014, lng: 144.9869 },
  carlton: { lat: -37.8000, lng: 144.9667 },
  'carlton north': { lat: -37.7836, lng: 144.9711 },
  'south melbourne': { lat: -37.8333, lng: 144.9583 },
  'port melbourne': { lat: -37.8408, lng: 144.9389 },
  albertpark: { lat: -37.8419, lng: 144.9536 },
  'albert park': { lat: -37.8419, lng: 144.9536 },
  'middle park': { lat: -37.8506, lng: 144.9606 },
  brighton: { lat: -37.9067, lng: 144.9939 },
  'brighton east': { lat: -37.9075, lng: 145.0083 },
  elwood: { lat: -37.8825, lng: 144.9839 },
  caulfield: { lat: -37.8783, lng: 145.0214 },
  'caulfield north': { lat: -37.8753, lng: 145.0228 },
  'caulfield south': { lat: -37.8950, lng: 145.0250 },
  malvern: { lat: -37.8617, lng: 145.0289 },
  'malvern east': { lat: -37.8722, lng: 145.0414 },
  armadale: { lat: -37.8567, lng: 145.0203 },
  hawthorn: { lat: -37.8225, lng: 145.0356 },
  'hawthorn east': { lat: -37.8233, lng: 145.0497 },
  kew: { lat: -37.8061, lng: 145.0344 },
  abbotsford: { lat: -37.8014, lng: 144.9994 },
  brunswick: { lat: -37.7667, lng: 144.9600 },
  'brunswick east': { lat: -37.7686, lng: 144.9783 },
  'brunswick west': { lat: -37.7647, lng: 144.9389 },
  northcote: { lat: -37.7700, lng: 144.9994 },
  thornbury: { lat: -37.7575, lng: 145.0017 },
  preston: { lat: -37.7400, lng: 145.0011 },
  footscray: { lat: -37.8000, lng: 144.9000 },
  yarraville: { lat: -37.8156, lng: 144.8889 },
  newport: { lat: -37.8417, lng: 144.8839 },
  williamstown: { lat: -37.8639, lng: 144.8978 },
  docklands: { lat: -37.8167, lng: 144.9461 },
  'south wharf': { lat: -37.8244, lng: 144.9522 },
  southbank: { lat: -37.8231, lng: 144.9647 },
  'east melbourne': { lat: -37.8167, lng: 144.9833 },
  'north melbourne': { lat: -37.8000, lng: 144.9500 },
  'west melbourne': { lat: -37.8083, lng: 144.9417 },
  parkville: { lat: -37.7833, lng: 144.9500 },
  'flemington': { lat: -37.7867, lng: 144.9281 },

  // Sydney / NSW
  sydney: { lat: -33.8688, lng: 151.2093 },
  'sydney cbd': { lat: -33.8688, lng: 151.2093 },
  bondi: { lat: -33.8915, lng: 151.2767 },
  'bondi beach': { lat: -33.8908, lng: 151.2743 },
  'bondi junction': { lat: -33.8917, lng: 151.2492 },
  surryhills: { lat: -33.8847, lng: 151.2106 },
  'surry hills': { lat: -33.8847, lng: 151.2106 },
  paddington: { lat: -33.8847, lng: 151.2275 },
  newtown: { lat: -33.8978, lng: 151.1794 },
  manly: { lat: -33.7969, lng: 151.2856 },
  parramatta: { lat: -33.8150, lng: 151.0011 },
  chatswood: { lat: -33.7969, lng: 151.1828 },

  // Brisbane / QLD
  brisbane: { lat: -27.4698, lng: 153.0251 },
  fortitude: { lat: -27.4567, lng: 153.0322 },
  'fortitude valley': { lat: -27.4567, lng: 153.0322 },
  'new farm': { lat: -27.4683, lng: 153.0506 },
  'south brisbane': { lat: -27.4811, lng: 153.0181 },
  'gold coast': { lat: -28.0167, lng: 153.4000 },
  surfers: { lat: -28.0028, lng: 153.4306 },
  'surfers paradise': { lat: -28.0028, lng: 153.4306 },

  // Perth / WA
  perth: { lat: -31.9505, lng: 115.8605 },
  fremantle: { lat: -32.0569, lng: 115.7464 },

  // Adelaide / SA
  adelaide: { lat: -34.9285, lng: 138.6007 },

  // Canberra / ACT
  canberra: { lat: -35.2809, lng: 149.1300 },

  // Hobart / TAS
  hobart: { lat: -42.8821, lng: 147.3272 },

  // Darwin / NT
  darwin: { lat: -12.4634, lng: 130.8456 },
};

export function lookupSuburbCentroid(name: string): { lat: number; lng: number } | null {
  if (!name) return null;
  const key = name.trim().toLowerCase().replace(/,.*$/, '').trim();
  if (SUBURB_CENTROIDS[key]) return SUBURB_CENTROIDS[key];
  // Try first token (e.g. "Prahran VIC 3181" -> "prahran")
  const firstWord = key.split(/\s+/)[0];
  if (firstWord && SUBURB_CENTROIDS[firstWord]) return SUBURB_CENTROIDS[firstWord];
  return null;
}
