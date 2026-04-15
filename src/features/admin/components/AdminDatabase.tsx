import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Table2, Trash2, ChevronLeft, ChevronRight, Loader2, RefreshCw, Sprout, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { seedProperties } from '@/features/admin/utils/seedProperties';
import { toast as sonnerToast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const TABLES = [
  { name: 'profiles', deletable: false },
  { name: 'properties', deletable: true },
  { name: 'agents', deletable: false },
  { name: 'leads', deletable: true },
  { name: 'voice_searches', deletable: true },
  { name: 'saved_properties', deletable: true },
  { name: 'user_roles', deletable: false },
  { name: 'lead_events', deletable: true },
  { name: 'user_preferences', deletable: false },
];

const AdminDatabase = () => {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState('profiles');
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [tableStats, setTableStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchStats = async () => {
    try {
      const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
      const result = await callAdminFunction('table_stats');
      setTableStats(result?.stats || {});
    } catch {}
  };

  const fetchTable = async () => {
    setLoading(true);
    try {
      const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
      const result = await callAdminFunction('browse_table', { table: selectedTable, limit, offset });
      setData(result?.data || []);
      setTotal(result?.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchTable(); }, [selectedTable, offset]);

  const handleDelete = async (recordId: string) => {
    if (!confirm('Delete this record?')) return;
    const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
    await callAdminFunction('delete_record', { table: selectedTable, record_id: recordId });
    toast({ title: 'Record deleted' });
    fetchTable();
    fetchStats();
  };

  const tableConfig = TABLES.find((t) => t.name === selectedTable);
  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'id').slice(0, 5) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Table selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABLES.map((t) => (
          <button
            key={t.name}
            onClick={() => { setSelectedTable(t.name); setOffset(0); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              selectedTable === t.name ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Table2 size={12} />
            {t.name}
            {tableStats[t.name] !== undefined && (
              <span className="text-[10px] opacity-70">({tableStats[t.name]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Database size={14} className="text-primary" />
          {selectedTable} <span className="text-muted-foreground font-normal">({total} records)</span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const count = await seedProperties();
                sonnerToast.success(`Seeded ${count} properties successfully!`);
                if (selectedTable === 'properties') fetchTable();
                fetchStats();
              } catch (e: unknown) {
                sonnerToast.error(getErrorMessage(e) || 'Seed failed');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
          >
            <Sprout size={14} /> Seed Properties
          </button>
          <button
            onClick={async () => {
              try {
                const { data: result, error } = await supabase.functions.invoke('seed-demo-listings');
                if (error) throw new Error(error.message || 'Seed failed');
                sonnerToast.success(`Seeded ${result.total} listings (${result.sale_count} sale, ${result.rental_count} rental)`);
                if (selectedTable === 'properties') fetchTable();
                fetchStats();
              } catch (e: unknown) {
                sonnerToast.error(getErrorMessage(e) || 'Seed failed');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
          >
            <Landmark size={14} /> Seed Demo Listings
          </button>
          <button onClick={fetchTable} className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors">
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2.5 text-muted-foreground font-medium">ID</th>
                    {columns.map((col) => (
                      <th key={col} className="text-left p-2.5 text-muted-foreground font-medium truncate max-w-[120px]">{col}</th>
                    ))}
                    {tableConfig?.deletable && <th className="text-left p-2.5 text-muted-foreground font-medium w-12"></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="p-2.5 text-muted-foreground font-mono">{row.id?.slice(0, 8)}...</td>
                      {columns.map((col) => (
                        <td key={col} className="p-2.5 text-foreground truncate max-w-[150px]">
                          {typeof row[col] === 'object' ? JSON.stringify(row[col])?.slice(0, 40) : String(row[col] ?? '—').slice(0, 40)}
                        </td>
                      ))}
                      {tableConfig?.deletable && (
                        <td className="p-2.5">
                          <button onClick={() => handleDelete(row.id)} className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No records</p>}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default AdminDatabase;
