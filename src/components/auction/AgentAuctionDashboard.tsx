import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, Phone, Mail, ClipboardList } from 'lucide-react';
import { RecordAuctionResultModal } from './RecordAuctionResultModal';

interface Props {
  propertyId: string;
  auctionDate: string | null;
  listingStatus: string;
}

interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  registered_at: string;
  attended: boolean;
}

export function AgentAuctionDashboard({ propertyId, auctionDate, listingStatus }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);

  const isAuction = listingStatus === 'auction';
  const isPast = auctionDate ? new Date(auctionDate) < new Date() : false;

  useEffect(() => {
    if (!isAuction) return;
    supabase
      .from('auction_registrations')
      .select('id, name, email, phone, registered_at, attended')
      .eq('property_id', propertyId)
      .order('registered_at', { ascending: false })
      .then(({ data }) => {
        setRegistrations((data as unknown as Registration[]) ?? []);
        setLoading(false);
      });
  }, [propertyId, isAuction]);

  if (!isAuction) return null;

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-card border border-border shadow-card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users size={16} className="text-primary" />
            {loading ? '—' : registrations.length} registered bidder{registrations.length !== 1 ? 's' : ''}
          </p>
          {isPast && (
            <button
              onClick={() => setShowResultModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ClipboardList size={14} />
              Record result
            </button>
          )}
        </div>

        {registrations.length > 0 && (
          <div className="space-y-2">
            {registrations.map(reg => (
              <div key={reg.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {reg.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{reg.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Mail size={10} /> {reg.email}
                    </span>
                    {reg.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} /> {reg.phone}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  reg.attended
                    ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {reg.attended ? 'Attended' : 'Registered'}
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && registrations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No registrations yet. Share the listing to attract buyers.
          </p>
        )}
      </div>

      {showResultModal && (
        <RecordAuctionResultModal
          propertyId={propertyId}
          auctionDate={auctionDate}
          onClose={() => setShowResultModal(false)}
          onSaved={() => setRegistrations([])}
        />
      )}
    </div>
  );
}
