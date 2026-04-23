import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { BidFeed } from '../components/BidFeed';
import { AuctionCountdown } from '../components/AuctionCountdown';
import { AuctionRegistrationModal } from '../components/AuctionRegistrationModal';
import { AuctionStatusBadge } from '../components/AuctionStatusBadge';
import { LANG_OPTIONS, getPreferredLang, setPreferredLang, t, type AuctionLang } from '../lib/auctionI18n';
import { capture } from '@/shared/lib/posthog';
import { Loader2 } from 'lucide-react';
import type { AuctionPublicView } from '@/types/auction';

interface PropertyInfo {
  address: string;
  suburb: string;
  state: string;
  main_image_url?: string;
}

export default function LiveAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<AuctionPublicView | null>(null);
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<AuctionLang>(getPreferredLang);
  const [showRegModal, setShowRegModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: a } = await supabase
        .from('auctions')
        .select('id, property_id, auction_date, auction_time, auction_timezone, auction_location, is_online, online_platform_url, auctioneer_name, auctioneer_firm, status, total_registered, last_bid_amount, total_bids, sold_price')
        .eq('id', id)
        .maybeSingle();
      if (a) {
        setAuction(a as unknown as AuctionPublicView);
        const { data: p } = await supabase
          .from('properties')
          .select('address, suburb, state, main_image_url')
          .eq('id', a.property_id)
          .maybeSingle();
        if (p) setProperty(p as unknown as PropertyInfo);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (id) capture('auction_viewed', { auction_id: id, language: lang });
  }, [id, lang]);

  const handleLangSwitch = (newLang: AuctionLang) => {
    const prev = lang;
    setLang(newLang);
    setPreferredLang(newLang);
    if (id) capture('auction_language_switched', { auction_id: id, from_language: prev, to_language: newLang });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-base font-medium text-foreground">Auction not found or has ended</p>
        <a
          href="/"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Back to homepage
        </a>
      </div>
    );
  }

  const isLive = auction.status === 'live';
  const isSold = ['sold', 'sold_prior', 'sold_after'].includes(auction.status);
  const isPassedIn = auction.status === 'passed_in';
  const canRegister = ['scheduled', 'open', 'live'].includes(auction.status);
  const address = property ? `${property.address}, ${property.suburb} ${property.state}` : 'Property Auction';

  const statusBanner = isLive
    ? t('live_now', lang)
    : isSold
    ? t('sold_status', lang)
    : isPassedIn
    ? t('passed_in', lang)
    : t('upcoming', lang);

  return (
    <>
      <Helmet><title>Live Auction — {address}</title></Helmet>
      <div className="min-h-screen bg-background">
        {/* Header image */}
        {property?.main_image_url && (
          <div className="relative h-48 sm:h-64 w-full overflow-hidden">
            <img src={property.main_image_url} alt={address} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Address + status */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">{address}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <AuctionStatusBadge status={auction.status} />
              <span className="text-sm font-semibold text-muted-foreground">{statusBanner}</span>
            </div>
          </div>

          {/* Language toggle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleLangSwitch(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  lang === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
                }`}
              >
                {opt.flag} {opt.label}
              </button>
            ))}
          </div>

          {/* Countdown */}
          {!isSold && !isPassedIn && (
            <AuctionCountdown auctionDate={auction.auction_date} auctionTime={auction.auction_time} status={auction.status} />
          )}

          {/* Sold banner */}
          {isSold && auction.sold_price && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-sm font-medium text-emerald-700">{t('sold', lang)}</p>
              <p className="text-3xl font-bold text-emerald-800 mt-1">
                ${auction.sold_price.toLocaleString('en-AU')}
              </p>
            </div>
          )}

          {/* Current bid */}
          {isLive && auction.last_bid_amount && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('new_bid', lang).replace(':', '')}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                ${auction.last_bid_amount.toLocaleString('en-AU')}
              </p>
            </div>
          )}

          {/* Live bid feed */}
          <BidFeed auctionId={auction.id} readOnly />

          {/* Register CTA */}
          {canRegister && (
            <button
              onClick={() => {
                setShowRegModal(true);
                if (id) capture('auction_registration_started', { auction_id: id, language: lang });
              }}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {t('register_to_bid', lang)}
            </button>
          )}
        </div>

        {showRegModal && (
          <AuctionRegistrationModal
            auctionId={auction.id}
            isOnline={auction.is_online}
            open={showRegModal}
            onClose={() => setShowRegModal(false)}
          />
        )}
      </div>
    </>
  );
}
