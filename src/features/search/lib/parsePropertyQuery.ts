export interface ParsedFilters {
  location?: string;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  beds?: number;
  features: string[];
  intent?: 'sale' | 'rent';
  floorAreaSqm?: number;
  landSizeSqm?: number;
}

const PROPERTY_TYPES: Record<string, string> = {
  house: 'house', home: 'house', villa: 'villa', apartment: 'apartment',
  unit: 'unit', flat: 'apartment', townhouse: 'townhouse', condo: 'apartment',
  duplex: 'duplex', penthouse: 'penthouse', studio: 'studio',
  casa: 'house', maison: 'house', appartement: 'apartment', wohnung: 'apartment',
  piso: 'apartment', mansión: 'villa', 'マンション': 'apartment', '家': 'house',
  '公寓': 'apartment', '别墅': 'villa', 'квартира': 'apartment', 'дом': 'house',
  // Commercial
  office: 'Office', 'office space': 'Office', 'commercial office': 'Office',
  retail: 'Retail', 'shop': 'Retail', 'retail shop': 'Retail', 'shopfront': 'Retail', 'storefront': 'Retail',
  industrial: 'Industrial', factory: 'Industrial', 'industrial unit': 'Industrial', 'industrial shed': 'Industrial',
  warehouse: 'Warehouse', 'storage facility': 'Warehouse', shed: 'Warehouse',
  // Land
  land: 'Land', 'vacant land': 'Land', 'block of land': 'Land', 'land parcel': 'Land',
  acreage: 'Land', rural: 'Land', 'rural property': 'Land', 'farm': 'Land', 'lifestyle property': 'Land',
  'development site': 'Land', 'subdivided land': 'Land',
};

const FEATURES = [
  'pool', 'swimming pool', 'garage', 'double garage', 'garden', 'balcony',
  'renovated', 'new', 'modern', 'ocean view', 'sea view', 'beach',
  'near beach', 'waterfront', 'parking', 'air conditioning', 'fireplace',
  'ensuite', 'study', 'granny flat', 'solar', 'corner block',
];

function parsePrice(text: string): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {};
  const t = text.toLowerCase();

  // "between X and Y"
  const between = t.match(/between\s+\$?([\d,.]+)\s*(?:k|thousand|million|m)?\s*(?:and|to|-)\s*\$?([\d,.]+)\s*(k|thousand|million|m)?/i);
  if (between) {
    const mult = (s?: string) => !s ? 1 : (s === 'k' || s === 'thousand') ? 1000 : 1000000;
    const suffix = between[3];
    result.min = parseFloat(between[1].replace(/,/g, '')) * mult(suffix);
    result.max = parseFloat(between[2].replace(/,/g, '')) * mult(suffix);
    return result;
  }

  // "under/below/less than X"
  const under = t.match(/(?:under|below|less than|up to|max|maximum)\s+\$?([\d,.]+)\s*(k|thousand|million|m)?/i);
  if (under) {
    const mult = under[2] === 'k' || under[2] === 'thousand' ? 1000 : under[2] === 'm' || under[2] === 'million' ? 1000000 : 1;
    result.max = parseFloat(under[1].replace(/,/g, '')) * mult;
    return result;
  }

  // "over/above/more than X"
  const over = t.match(/(?:over|above|more than|at least|min|minimum)\s+\$?([\d,.]+)\s*(k|thousand|million|m)?/i);
  if (over) {
    const mult = over[2] === 'k' || over[2] === 'thousand' ? 1000 : over[2] === 'm' || over[2] === 'million' ? 1000000 : 1;
    result.min = parseFloat(over[1].replace(/,/g, '')) * mult;
    return result;
  }

  // "$800k" or "1.2 million"
  const price = t.match(/\$?([\d,.]+)\s*(k|thousand|million|m)\b/i);
  if (price) {
    const mult = price[2] === 'k' || price[2] === 'thousand' ? 1000 : 1000000;
    const val = parseFloat(price[1].replace(/,/g, '')) * mult;
    result.max = val;
    result.min = val * 0.8;
    return result;
  }

  return result;
}

export function parsePropertyQuery(text: string): ParsedFilters {
  const lower = text.toLowerCase();
  const filters: ParsedFilters = { features: [] };

  // Intent
  if (/\b(for rent|rental|to rent|renting|lease)\b/i.test(lower)) {
    filters.intent = 'rent';
  } else if (/\b(for sale|to buy|buying|purchase)\b/i.test(lower)) {
    filters.intent = 'sale';
  }

  // Beds
  const bedMatch = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br|hab|chambres?|zimmer|спальн|寝室|卧室|بيدروم)/i);
  if (bedMatch) filters.beds = parseInt(bedMatch[1]);
  const atLeast = lower.match(/at least\s+(\d+)\s*bed/i);
  if (atLeast) filters.beds = parseInt(atLeast[1]);

  // Floor area (commercial)
  const floorMatch = lower.match(/(\d+)\s*(?:sqm|m²|m2|square\s*met(?:re|er)s?)\s*(?:office|warehouse|retail|industrial|floor|space)?/i);
  if (floorMatch) filters.floorAreaSqm = parseInt(floorMatch[1]);

  // Land size
  const landSizeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(sqm|m²|m2|ha|hectare|acre)s?\s*(?:block|lot|land|parcel)?/i);
  if (landSizeMatch) {
    const val = parseFloat(landSizeMatch[1]);
    const unit = landSizeMatch[2].toLowerCase();
    filters.landSizeSqm = (unit === 'ha' || unit === 'hectare') ? val * 10000 : (unit === 'acre') ? val * 4047 : val;
  }

  // Property type
  for (const [keyword, type] of Object.entries(PROPERTY_TYPES)) {
    if (lower.includes(keyword)) {
      filters.propertyType = type;
      break;
    }
  }

  // Price
  const { min, max } = parsePrice(text);
  if (min) filters.priceMin = min;
  if (max) filters.priceMax = max;

  // Features
  for (const feature of FEATURES) {
    if (lower.includes(feature)) {
      filters.features.push(feature);
    }
  }

  // Location - extract "in <location>" or remaining capitalized words
  const inMatch = text.match(/\b(?:in|at|near|around)\s+([A-Z][a-zA-Zà-ÿ\s,]+)/);
  if (inMatch) {
    filters.location = inMatch[1].trim().replace(/\s+(for|under|below|over|with|and)\b.*$/i, '').trim();
  }

  return filters;
}

export function filtersToChips(filters: ParsedFilters): { label: string; key: string }[] {
  const chips: { label: string; key: string }[] = [];
  if (filters.location) chips.push({ label: `📍 ${filters.location}`, key: 'location' });
  if (filters.beds) chips.push({ label: `🛏️ ${filters.beds} bed${filters.beds > 1 ? 's' : ''}`, key: 'beds' });
  if (filters.propertyType) chips.push({ label: `🏠 ${filters.propertyType}`, key: 'type' });
  if (filters.priceMax && filters.priceMin) {
    chips.push({ label: `💰 $${(filters.priceMin/1000).toFixed(0)}k–$${(filters.priceMax/1000).toFixed(0)}k`, key: 'price' });
  } else if (filters.priceMax) {
    chips.push({ label: `💰 Under $${(filters.priceMax/1000).toFixed(0)}k`, key: 'price' });
  } else if (filters.priceMin) {
    chips.push({ label: `💰 Over $${(filters.priceMin/1000).toFixed(0)}k`, key: 'price' });
  }
  if (filters.intent) chips.push({ label: filters.intent === 'rent' ? '🔑 For rent' : '🏷️ For sale', key: 'intent' });
  filters.features.forEach((f, i) => chips.push({ label: `✨ ${f}`, key: `feature-${i}` }));
  return chips;
}
