import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import type { Contact } from '@/features/agents/hooks/useContacts';

const EXPECTED_HEADERS = ['first_name', 'last_name', 'email', 'phone', 'mobile', 'contact_type', 'ranking', 'suburb', 'state', 'postcode', 'budget_min', 'budget_max', 'source', 'notes'];

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

interface Props {
  onClose: () => void;
  onImport: (rows: Partial<Contact>[]) => Promise<void>;
}

const CsvImportModal = ({ onClose, onImport }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Partial<Contact>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importSource, setImportSource] = useState('csv_import');

  const parseCsv = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setError('CSV must have a header row and at least one data row.');
      return;
    }

    const rawHeaders = lines[0].split(',').map(h => h.replace(/["']/g, '').trim().toLowerCase().replace(/\s+/g, '_'));
    setHeaders(rawHeaders);

    const sanitizeText = (val: string) => val.replace(/<[^>]*>/g, '').trim();

    const rows: Partial<Contact>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);
      const row: any = {};
      rawHeaders.forEach((h, idx) => {
        const val = sanitizeText(values[idx] || '');
        if (h === 'first_name' && val) row.first_name = val;
        else if (h === 'last_name') row.last_name = val || null;
        else if (h === 'email') row.email = val || null;
        else if (h === 'phone') row.phone = val || null;
        else if (h === 'mobile') row.mobile = val || null;
        else if (h === 'contact_type') row.contact_type = ['buyer', 'seller', 'landlord', 'tenant', 'both'].includes(val.toLowerCase()) ? val.toLowerCase() : 'buyer';
        else if (h === 'ranking') row.ranking = ['hot', 'warm', 'cold'].includes(val.toLowerCase()) ? val.toLowerCase() : 'cold';
        else if (h === 'suburb') row.suburb = val || null;
        else if (h === 'state') row.state = val || null;
        else if (h === 'postcode') row.postcode = val || null;
        else if (h === 'budget_min' && val) row.budget_min = Number(val) || null;
        else if (h === 'budget_max' && val) row.budget_max = Number(val) || null;
        else if (h === 'source') row.source = val || 'csv_import';
        else if (h === 'notes') row.notes = val || null;
      });
      if (row.first_name) {
        if (!row.source) row.source = 'csv_import';
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      setError('No valid rows found. Make sure first_name column exists.');
      return;
    }

    setError('');
    setParsed(rows);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => parseCsv(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const rowsWithSource = parsed.map(r => ({ ...r, source: importSource }));
      await onImport(rowsWithSource);
    } catch (err) {
      setError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          {!parsed.length && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-semibold mb-1">Expected columns:</p>
                <div className="flex flex-wrap gap-1">
                  {EXPECTED_HEADERS.map(h => (
                    <Badge key={h} variant="outline" className="text-[10px]">{h}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Preview */}
          {parsed.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <FileText size={16} className="text-primary" />
                <span className="font-medium">{fileName}</span>
                <Badge variant="secondary" className="text-xs">{parsed.length} contacts</Badge>
              </div>

              <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Ranking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">{r.first_name} {r.last_name || ''}</td>
                        <td className="p-2 text-muted-foreground">{r.email || '—'}</td>
                        <td className="p-2 capitalize">{r.contact_type}</td>
                        <td className="p-2 capitalize">{r.ranking}</td>
                      </tr>
                    ))}
                    {parsed.length > 10 && (
                      <tr><td colSpan={4} className="p-2 text-center text-muted-foreground">...and {parsed.length - 10} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium whitespace-nowrap">Import source:</label>
                <select
                  value={importSource}
                  onChange={(e) => setImportSource(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-1"
                >
                  <option value="csv_import">General CSV import</option>
                  <option value="open_home">Open home sign-in</option>
                  <option value="rea_enquiry">REA enquiry export</option>
                  <option value="domain_enquiry">Domain enquiry export</option>
                  <option value="referral">Referral list</option>
                  <option value="cold_call">Cold call list</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setParsed([]); setFileName(''); }}>
                  Choose different file
                </Button>
                <Button onClick={handleImport} disabled={importing} className="gap-1.5">
                  <Check size={14} /> {importing ? `Importing ${parsed.length}...` : `Import ${parsed.length} Contacts`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportModal;
