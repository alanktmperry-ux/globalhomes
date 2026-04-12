import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useRentalSearch, type RentalFilters } from '../hooks/useRentalSearch';
import { RentalSearchFilters } from '../components/RentalSearchFilters';
import { RentalCard } from '../components/RentalCard';

export default function RentSearchPage() {
  const [filters, setFilters] = useState<RentalFilters>({});
  const { properties, loading, total } = useRentalSearch(filters);

  return (
    <>
      <Helmet>
        <title>Rental Properties Australia — Find Your Next Home</title>
        <meta name="description" content="Browse rental properties across Australia. Search by suburb, price, bedrooms, and pet-friendly options. Apply online with ListHQ." />
        <link rel="canonical" href="https://globalhomes.lovable.app/rent" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Properties for Rent
          </h1>
          <p className="text-muted-foreground mt-1">
            {loading ? 'Searching…' : `${total.toLocaleString()} rental ${total === 1 ? 'property' : 'properties'} found`}
          </p>
        </div>

        {/* Filters */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur py-3 -mx-4 px-4">
          <RentalSearchFilters value={filters} onChange={setFilters} />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {!loading && `Showing ${properties.length} of ${total}`}
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-secondary rounded-2xl h-72" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No rentals match your filters.</p>
            <button onClick={() => setFilters({})}
              className="mt-4 text-primary underline text-sm">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {properties.map(p => <RentalCard key={p.id} property={p} />)}
          </div>
        )}
      </div>
    </>
  );
}
