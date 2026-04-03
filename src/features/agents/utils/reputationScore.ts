export interface ReputationInput {
  avgResponseMinutes?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  soldListings?: number;
  totalListings?: number;
  avgDaysOnMarket?: number | null;
  hasAvatar?: boolean;
  hasBio?: boolean;
  hasPhone?: boolean;
  hasSpecialization?: boolean;
  hasServiceAreas?: boolean;
}

export interface ReputationResult {
  total: number;
  responseTime: number;
  reviews: number;
  salesRate: number;
  profile: number;
}

export function calcReputationScore(input: ReputationInput): ReputationResult {
  // Response time (0–25)
  let responseTime = 0;
  if (input.avgResponseMinutes != null) {
    if (input.avgResponseMinutes < 5) responseTime = 25;
    else if (input.avgResponseMinutes < 60) responseTime = 20;
    else if (input.avgResponseMinutes < 1440) responseTime = 10;
  }

  // Reviews (0–25)
  let reviews = 0;
  if (input.rating != null && input.rating > 0) {
    const base = (input.rating / 5) * 25;
    const countWeight = Math.min((input.reviewCount || 0) / 20, 1);
    reviews = Math.round(base * (0.5 + 0.5 * countWeight));
  }

  // Listing performance (0–25)
  let salesRate = 0;
  if (input.totalListings && input.totalListings > 0) {
    salesRate = Math.round(((input.soldListings || 0) / input.totalListings) * 25);
  }

  // Days on market (0–15)
  let dom = 5;
  if (input.avgDaysOnMarket != null) {
    if (input.avgDaysOnMarket < 30) dom = 15;
    else if (input.avgDaysOnMarket < 60) dom = 10;
    else dom = 5;
  }

  // Profile completeness (0–10)
  let profile = 0;
  if (input.hasAvatar) profile += 2;
  if (input.hasBio) profile += 2;
  if (input.hasPhone) profile += 2;
  if (input.hasSpecialization) profile += 2;
  if (input.hasServiceAreas) profile += 2;

  const total = Math.min(responseTime + reviews + salesRate + dom + profile, 100);

  return { total, responseTime, reviews, salesRate: salesRate + dom, profile };
}

export const DEMO_REPUTATION: ReputationResult = {
  total: 84,
  responseTime: 20,
  reviews: 22,
  salesRate: 32,
  profile: 10,
};

export function getScoreColor(score: number): { ring: string; text: string; bg: string } {
  if (score >= 80) return { ring: 'stroke-green-500', text: 'text-green-500', bg: 'bg-green-500/10' };
  if (score >= 60) return { ring: 'stroke-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10' };
  return { ring: 'stroke-red-500', text: 'text-red-500', bg: 'bg-red-500/10' };
}

export const REPUTATION_TOOLTIP = 'Score calculated from verified review data, response times, and listing performance on ListHQ';
