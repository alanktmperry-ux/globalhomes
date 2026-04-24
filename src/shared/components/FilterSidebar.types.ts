// Lightweight types + defaults for FilterSidebar.
// Extracted so that hooks/pages can reference Filters without statically
// importing the heavy FilterSidebar component (which pulls in calendar,
// react-day-picker, date-fns, framer-motion, etc.).

export interface Filters {
  priceRange: [number, number];
  propertyTypes: string[];
  minBeds: number;
  minBaths: number;
  minParking: number;
  features: string[];
  // Rental-specific
  petFriendly: boolean;
  furnished: boolean;
  availableNow: boolean;
  availableFrom: Date | null;
  leaseTerm: string;
  schoolZone: string;
  // Sale-specific
  firstHomeBuyer: boolean;
}

export const defaultFilters: Filters = {
  priceRange: [0, 5_000_000],
  propertyTypes: [],
  minBeds: 0,
  minBaths: 0,
  minParking: 0,
  features: [],
  petFriendly: false,
  furnished: false,
  availableNow: false,
  availableFrom: null,
  leaseTerm: '',
  schoolZone: '',
  firstHomeBuyer: false,
};

export const defaultRentalFilters: Filters = {
  ...defaultFilters,
  priceRange: [0, 3_000],
};
