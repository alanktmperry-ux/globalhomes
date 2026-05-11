// Static seed data for the homepage "Featured in [Location]" grid.
// This file is the contract for the backend table that ships in a later phase:
//   public.featured_listings — sponsored by agents via Halo Boost billing (Stripe).
// When the backend lands, swap this static array for a Supabase query of the
// same shape. Do not change the shape without updating the consumer component.

export interface FeaturedListing {
  id: string;
  title: string;
  suburb: string;
  state: string;
  price: string;
  beds: number;
  baths: number;
  cars: number;
  propertyType: string;
  image: string;          // gradient or remote URL — null-safe in component
  gradient: string;       // fallback when image missing
  agentName: string;
  agentLanguages: string[]; // e.g. ["EN", "中文"]
  boosted: true;          // always true for this surface
  href: string;           // route to listing
}

const GRADS = [
  "linear-gradient(135deg, #2563EB 0%, #1d4ed8 55%, #0a0f1e 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #1e40af 60%, #0a0f1e 100%)",
  "linear-gradient(135deg, #60a5fa 0%, #2563EB 55%, #1e3a8a 100%)",
  "linear-gradient(135deg, #1e3a8a 0%, #2563EB 50%, #60a5fa 100%)",
  "linear-gradient(135deg, #4F88FF 0%, #2563EB 60%, #1e3a8a 100%)",
  "linear-gradient(135deg, #93C5FD 0%, #4F88FF 55%, #2563EB 100%)",
];

export const FEATURED_LISTINGS: FeaturedListing[] = [
  {
    id: "feat-1",
    title: "Spacious family home, walk to top schools",
    suburb: "Box Hill",
    state: "VIC",
    price: "$1,250,000",
    beds: 4, baths: 2, cars: 2,
    propertyType: "House",
    image: "", gradient: GRADS[0],
    agentName: "Mei Chen",
    agentLanguages: ["EN", "中文"],
    boosted: true,
    href: "/buy",
  },
  {
    id: "feat-2",
    title: "Modern apartment with city views",
    suburb: "Doncaster",
    state: "VIC",
    price: "$685,000",
    beds: 2, baths: 2, cars: 1,
    propertyType: "Apartment",
    image: "", gradient: GRADS[1],
    agentName: "David Nguyen",
    agentLanguages: ["EN", "Tiếng Việt"],
    boosted: true,
    href: "/buy",
  },
  {
    id: "feat-3",
    title: "Renovated heritage near cafes",
    suburb: "Glen Waverley",
    state: "VIC",
    price: "$1,480,000",
    beds: 4, baths: 3, cars: 2,
    propertyType: "House",
    image: "", gradient: GRADS[2],
    agentName: "Priya Sharma",
    agentLanguages: ["EN", "हिंदी"],
    boosted: true,
    href: "/buy",
  },
  {
    id: "feat-4",
    title: "Brand-new townhouse, 5 min to station",
    suburb: "Templestowe",
    state: "VIC",
    price: "$925,000",
    beds: 3, baths: 2, cars: 2,
    propertyType: "Townhouse",
    image: "", gradient: GRADS[3],
    agentName: "Wei Lin",
    agentLanguages: ["EN", "中文"],
    boosted: true,
    href: "/buy",
  },
  {
    id: "feat-5",
    title: "Quiet cul-de-sac, big backyard",
    suburb: "Balwyn",
    state: "VIC",
    price: "$2,150,000",
    beds: 5, baths: 3, cars: 2,
    propertyType: "House",
    image: "", gradient: GRADS[4],
    agentName: "Sofia Romano",
    agentLanguages: ["EN", "Italiano"],
    boosted: true,
    href: "/buy",
  },
  {
    id: "feat-6",
    title: "Luxury penthouse with skyline views",
    suburb: "Southbank",
    state: "VIC",
    price: "$3,250,000",
    beds: 3, baths: 3, cars: 2,
    propertyType: "Penthouse",
    image: "", gradient: GRADS[5],
    agentName: "Marco Tan",
    agentLanguages: ["EN", "中文", "Bahasa"],
    boosted: true,
    href: "/buy",
  },
];
