import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (v: any) => string;
}

interface Props {
  filename: string;
  /** Async function that returns all rows to export (handles pagination, etc). */
  query: () => Promise<any[]>;
  columns: ExportColumn[];
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
}

function escapeCsv(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') v = JSON.stringify(v);
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ExportCSVButton({
  filename, columns, query, label = 'Export CSV', size = 'sm', variant = 'outline', disabled,
}: Props) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await query();
      const headerLine = columns.map((c) => escapeCsv(c.label)).join(',');
      const bodyLines = data.map((r) =>
        columns.map((c) => {
          const raw = (r as Record<string, unknown>)[c.key];
          const value = c.format ? c.format(raw) : raw;
          return escapeCsv(value);
        }).join(','),
      );
      const csv = [headerLine, ...bodyLines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Export ready', description: `${data.length} rows downloaded.` });
    } catch (e) {
      toast({ title: 'Export failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={onClick} size={size} variant={variant} disabled={disabled || busy} className="gap-2">
      <Download className="h-3.5 w-3.5" />
      {busy ? 'Exporting…' : label}
    </Button>
  );
}
