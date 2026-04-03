import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RentalKeyFacts } from '../components/RentalKeyFacts';
import { RentalApplicationForm } from '../components/RentalApplicationForm';
import { ChevronDown, ChevronUp, ArrowLeft, MapPin, Bed, Bath, Car } from 'lucide-react';

export default function RentalPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    if (!id) return;
    (supabase as any)
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }: any) => {
        setProperty(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="animate-pulse h-96 bg-secondary m-8 rounded-2xl" />;
  if (!property) return <p className="text-center py-16 text-muted-foreground">Property not found.</p>;

  const title = `${property.address}, ${property.suburb} ${property.state} — For Rent | ListHQ`;
  const desc = `Rent this ${property.beds}bd ${property.property_type || 'property'} in ${property.suburb}, ${property.state} for $${property.rental_weekly}/wk. Apply online on ListHQ.`;
  const imgUrl = property.images?.[0] || property.image_url;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Back */}
        <Link to="/rent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-4 h-4" /> Back to rentals
        </Link>

        {/* Hero image */}
        {imgUrl && (
          <div className="aspect-video rounded-2xl overflow-hidden bg-secondary">
            <img src={imgUrl} alt={property.address} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
              ${property.rental_weekly?.toLocaleString()}<span className="text-lg font-normal text-muted-foreground">/wk</span>
            </h1>
            {property.bond_amount && (
              <span className="text-sm text-muted-foreground">Bond: ${property.bond_amount.toLocaleString()}</span>
            )}
          </div>
          <p className="text-lg font-medium text-foreground">{property.address}</p>
          <p className="text-muted-foreground flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {property.suburb}, {property.state} {property.postcode}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {property.beds > 0 && <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {property.beds} Bed</span>}
            {property.baths > 0 && <span className="flex items-center gap-1"><Bath className="w-4 h-4" /> {property.baths} Bath</span>}
            {property.parking > 0 && <span className="flex items-center gap-1"><Car className="w-4 h-4" /> {property.parking} Car</span>}
          </div>
        </div>

        {/* Key facts */}
        <RentalKeyFacts property={property} />

        {/* Description */}
        {property.description && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">About this property</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {property.description}
            </p>
          </div>
        )}

        {/* Apply section */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowApp(!showApp)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition"
          >
            <span className="font-semibold text-foreground">
              📋 Apply for this Rental
            </span>
            {showApp ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {showApp && (
            <div className="px-5 pb-6">
              <RentalApplicationForm propertyId={property.id} rentPw={property.rental_weekly} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
