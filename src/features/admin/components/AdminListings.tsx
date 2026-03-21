import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

interface PropertyRow {
  id: string;
  title: string;
  address: string;
  suburb: string;
  price_formatted: string;
  is_active: boolean;
  views: number;
  created_at: string;
  is_featured: boolean;
  featured_until: string | null;
  boost_tier: string | null;
  boost_requested_at: string | null;
  boost_requested_tier: string | null;
}

interface Props {
  properties: PropertyRow[];
  onToggleActive: (id: string, isActive: boolean) => void;
  onActivateBoost: (id: string, tier: 'featured' | 'premier', days: number) => void;
}

const AdminListings = ({ properties, onToggleActive, onActivateBoost }: Props) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted-foreground font-medium">Property</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Price</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Views</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Boost</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => {
                const isFeaturedActive = p.is_featured && p.featured_until && new Date(p.featured_until) > new Date();
                const isBoostPending = p.boost_requested_at && !p.is_featured;

                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="p-3">
                      <p className="text-foreground font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.address}, {p.suburb}</p>
                    </td>
                    <td className="p-3 text-foreground">{p.price_formatted}</td>
                    <td className="p-3 text-muted-foreground">{p.views}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                      }`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="p-3">
                      {isFeaturedActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-500/20 text-teal-500">
                          {p.boost_tier === 'premier' ? 'Premier' : 'Featured'} · expires {format(parseISO(p.featured_until!), 'dd MMM')}
                        </span>
                      ) : isBoostPending ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-500 w-fit">
                            Pending {p.boost_requested_tier}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => onActivateBoost(p.id, 'featured', 30)}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-500/15 text-teal-500 hover:bg-teal-500/25 transition-colors"
                            >
                              Activate Featured
                            </button>
                            <button
                              onClick={() => onActivateBoost(p.id, 'premier', 30)}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                            >
                              Activate Premier
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No boost</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => onToggleActive(p.id, p.is_active)}
                        className="text-xs px-3 py-1 rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors"
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {properties.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No listings yet</p>
        )}
      </div>
    </motion.div>
  );
};

export default AdminListings;
