import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';

interface ParsedContact {
  full_name: string;
  email: string;
  phone: string;
  type: string;
  valid: boolean;
  error?: string;
}

type ImportStep = 'upload' | 'preview' | 'done';

function parseCSV(text: string): ParsedContact[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  function findCol(...variants: string[]): number {
    for (const v of variants) {
      const idx = headers.findIndex(h => h.includes(v));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const nameIdx = findCol('full name', 'name', 'contact');
  const firstIdx = findCol('first name', 'first');
  const lastIdx = findCol('last name', 'last', 'surname');
  const emailIdx = findCol('email', 'e-mail');
  const phoneIdx = findCol('phone', 'mobile', 'cell', 'tel');
  const typeIdx = findCol('type', 'category', 'role');

  return lines.slice(1).map((line) => {
    const cols = line.match(/(".*?"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) ?? line.split(',').map(c => c.trim());

    let full_name = nameIdx !== -1 ? (cols[nameIdx] ?? '') : '';
    if (!full_name && firstIdx !== -1) {
      full_name = [cols[firstIdx], lastIdx !== -1 ? cols[lastIdx] : ''].filter(Boolean).join(' ');
    }

    const email = emailIdx !== -1 ? (cols[emailIdx] ?? '').toLowerCase() : '';
    const phone = phoneIdx !== -1 ? (cols[phoneIdx] ?? '') : '';
    const rawType = typeIdx !== -1 ? (cols[typeIdx] ?? '').toLowerCase() : '';

    const type = rawType.includes('sell') ? 'seller'
      : rawType.includes('land') ? 'landlord'
      : rawType.includes('ten') ? 'tenant'
      : 'buyer';

    const valid = full_name.length > 0;
    const error = !valid ? 'Missing name' : undefined;

    return { full_name, email, phone, type, valid, error };
  }).filter(c => c.full_name || c.email);
}

export default function ContactImportPage() {
  const { user } = useAuth();
  const { agent } = useCurrentAgent();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const validContacts = parsedContacts.filter(c => c.valid);
  const invalidContacts = parsedContacts.filter(c => !c.valid);

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedContacts(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  async function importContacts() {
    if (!user || !agent) return;
    setImporting(true);
    setImportProgress(0);
    const batchSize = 50;

    for (let i = 0; i < validContacts.length; i += batchSize) {
      const batch = validContacts.slice(i, i + batchSize).map(c => {
        const parts = c.full_name.trim().split(/\s+/);
        const first_name = parts[0] || c.full_name;
        const last_name = parts.slice(1).join(' ') || null;
        return {
          created_by: user.id,
          agency_id: agent.agency_id,
          assigned_agent_id: agent.id,
          first_name,
          last_name,
          email: c.email || null,
          phone: c.phone || null,
          contact_type: c.type,
          source: 'csv_import',
        };
      });

      await supabase.from('contacts').insert(batch as any);
      setImportProgress(Math.min(i + batchSize, validContacts.length));
    }

    setImporting(false);
    setStep('done');
  }

  return (
    <>
      <Helmet>
        <title>Import Contacts — ListHQ</title>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Import contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bulk import your existing contacts from a CSV file
          </p>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-foreground">Upload your contacts CSV</p>
              <p className="text-sm text-muted-foreground mt-1">
                Export from Google Contacts, Outlook, or any spreadsheet
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Expected columns (any order, flexible naming):</p>
              <p>Name / Full Name / First Name + Last Name · Email · Phone · Type (buyer/seller/landlord)</p>
              <p>Extra columns are ignored. Only Name is required.</p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Review before importing</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {validContacts.length} valid · {invalidContacts.length} skipped
                </p>
              </div>
              <button
                onClick={() => { setStep('upload'); setParsedContacts([]); }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                ← Upload different file
              </button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Name</span><span>Email</span><span>Phone</span><span>Type</span>
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {validContacts.slice(0, 100).map((c, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 px-4 py-2.5 text-sm">
                    <span className="font-medium text-foreground truncate">{c.full_name}</span>
                    <span className="text-muted-foreground truncate">{c.email || '—'}</span>
                    <span className="text-muted-foreground truncate">{c.phone || '—'}</span>
                    <span className="text-muted-foreground capitalize">{c.type}</span>
                  </div>
                ))}
                {validContacts.length > 100 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground">
                    + {validContacts.length - 100} more contacts
                  </div>
                )}
              </div>
            </div>

            {invalidContacts.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{invalidContacts.length} row{invalidContacts.length !== 1 ? 's' : ''} will be skipped (missing name).</p>
              </div>
            )}

            <Button
              onClick={importContacts}
              disabled={importing || validContacts.length === 0}
              className="w-full"
            >
              {importing
                ? `Importing ${importProgress} of ${validContacts.length}...`
                : `Import ${validContacts.length} contacts →`}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Import complete</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {validContacts.length} contacts added to your CRM.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link to="/dashboard/crm">View contacts →</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => { setStep('upload'); setParsedContacts([]); setImportProgress(0); }}
              >
                Import another file
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
