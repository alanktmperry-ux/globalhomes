import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface PropertyRow {
  id: string;
  title: string;
  address: string;
  suburb: string;
  price_formatted: string;
  is_active: boolean;
  views: number;
  created_at: string;
}

interface Props {
  properties: PropertyRow[];
  onToggleActive: (id: string, isActive: boolean) => void;
}

const AdminListings = ({ properties, onToggleActive }: Props) => {
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
                <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
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
                    <button
                      onClick={() => onToggleActive(p.id, p.is_active)}
                      className="text-xs px-3 py-1 rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors"
                    >
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
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
