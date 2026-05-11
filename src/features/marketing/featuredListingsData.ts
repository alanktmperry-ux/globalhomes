// Static seed data for the homepage "Featured in [Location]" grid.
// Backend contract (later phase): public.featured_listings keyed by region,
// sponsored by agents via Halo Boost billing (Stripe). When the table lands,
// swap the static map for a Supabase query of the same shape.

export interface FeaturedListing {
  id: string;
  imageUrl: string;
  suburb: string;
  state: string;
  address: string;
  price: string;
  beds: number;
  baths: number;
  cars: number;
  buyerLanguages: string[]; // flag emojis
  agentName: string;
  agentInitials: string;
  agency: string;
  region: string; // used for matching to user location
}

export const FEATURED_LISTINGS_BY_REGION: Record<string, FeaturedListing[]> = {
  "Melbourne East": [
    {
      id: "L001",
      imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=85&w=900",
      suburb: "Doncaster",
      state: "VIC",
      address: "14 Manningham Rd",
      price: "$1,480,000",
      beds: 4, baths: 2, cars: 2,
      buyerLanguages: ["🇨🇳", "🇻🇳", "🇰🇷"],
      agentName: "Sarah Chen",
      agentInitials: "SC",
      agency: "Buxton",
      region: "Melbourne East",
    },
    {
      id: "L002",
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=85&w=900",
      suburb: "Doncaster East",
      state: "VIC",
      address: "22 Tunstall Square",
      price: "$1,895,000",
      beds: 5, baths: 3, cars: 2,
      buyerLanguages: ["🇨🇳", "🇮🇳"],
      agentName: "David Marinakis",
      agentInitials: "DM",
      agency: "Marshall White",
      region: "Melbourne East",
    },
    {
      id: "L003",
      imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=85&w=900",
      suburb: "Templestowe",
      state: "VIC",
      address: "8 Foote Street",
      price: "$2,250,000",
      beds: 4, baths: 3, cars: 2,
      buyerLanguages: ["🇨🇳", "🇰🇷"],
      agentName: "Jellis Nguyen",
      agentInitials: "JN",
      agency: "Jellis Craig",
      region: "Melbourne East",
    },
    {
      id: "L004",
      imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=85&w=900",
      suburb: "Bulleen",
      state: "VIC",
      address: "31 Templestowe Rd",
      price: "$1,295,000",
      beds: 3, baths: 2, cars: 2,
      buyerLanguages: ["🇮🇹", "🇬🇷"],
      agentName: "Marco Rossi",
      agentInitials: "MR",
      agency: "Fletchers",
      region: "Melbourne East",
    },
    {
      id: "L005",
      imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&q=85&w=900",
      suburb: "Box Hill",
      state: "VIC",
      address: "52 Whitehorse Rd",
      price: "$1,675,000",
      beds: 4, baths: 3, cars: 2,
      buyerLanguages: ["🇨🇳", "🇰🇷", "🇻🇳"],
      agentName: "Wei Lin",
      agentInitials: "WL",
      agency: "Ray White",
      region: "Melbourne East",
    },
    {
      id: "L006",
      imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=85&w=900",
      suburb: "Balwyn North",
      state: "VIC",
      address: "5 Belmore Rd",
      price: "$3,250,000",
      beds: 5, baths: 4, cars: 3,
      buyerLanguages: ["🇨🇳", "🇮🇳"],
      agentName: "Priya Joshi",
      agentInitials: "PJ",
      agency: "Kay & Burton",
      region: "Melbourne East",
    },
  ],
};

// Suburb → region map for geo matching.
export const SUBURB_TO_REGION: Record<string, string> = {
  "Doncaster": "Melbourne East",
  "Doncaster East": "Melbourne East",
  "Templestowe": "Melbourne East",
  "Bulleen": "Melbourne East",
  "Box Hill": "Melbourne East",
  "Balwyn": "Melbourne East",
  "Balwyn North": "Melbourne East",
  "Camberwell": "Melbourne East",
};

export function resolveFeaturedListings(suburb: string): FeaturedListing[] {
  const region = SUBURB_TO_REGION[suburb] || "Melbourne East";
  return FEATURED_LISTINGS_BY_REGION[region] || FEATURED_LISTINGS_BY_REGION["Melbourne East"];
}
