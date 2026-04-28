import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShieldCheck, ExternalLink, AlertTriangle, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface TICACheck {
  id: string;
  application_id: string;
  applicant_name: string;
  checked_by_agent_id: string | null;
  check_date: string;
  result: 'not_checked' | 'clear' | 'listed' | 'unable_to_check' | string;
  listing_types: string[] | null;
  tica_reference: string | null;
  notes: string | null;
}

interface Props {
  applicationId: string;
  applicantName: string;
}

const LISTING_OPTIONS: { value: string; label: string }[] = [
  { value: 'unpaid_rent', label: 'Unpaid Rent' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'breach', label: 'Breach of Agreement' },
  { value: 'fraud', label: 'Fraudulent Application' },
  { value: 'other', label: 'Other' },
];

export default function TICACheckPanel({ applicationId, applicantName }: Props) {
  const { user } = useAuth();
  const [check, setCheck] = useState<TICACheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  const [form, setForm] = useState({
    check_date: new Date().toISOString().slice(0, 10),
    result: 'clear' as 'clear' | 'listed' | 'unable_to_check',
    listing_types: [] as string[],
    tica_reference: '',
    notes: '',
  });

  const fetchCheck = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tica_checks' as any)
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setCheck((data as any) || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchCheck();
    if (user) {
      supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setAgentId(data?.id ?? null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, user]);

  const openModal = () => {
    if (check) {
      setForm({
        check_date: check.check_date,
        result:
          (check.result === 'listed' || check.result === 'unable_to_check'
            ? check.result
            : 'clear') as any,
        listing_types: check.listing_types || [],
        tica_reference: check.tica_reference || '',
        notes: check.notes || '',
      });
    } else {
      setForm({
        check_date: new Date().toISOString().slice(0, 10),
        result: 'clear',
        listing_types: [],
        tica_reference: '',
        notes: '',
      });
    }
    setOpen(true);
  };

  const toggleListingType = (val: string) => {
    setForm((f) => ({
      ...f,
      listing_types: f.listing_types.includes(val)
        ? f.listing_types.filter((x) => x !== val)
        : [...f.listing_types, val],
    }));
  };

  const handleSave = async () => {
    if (!agentId) {
      toast.error('Agent profile required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        application_id: applicationId,
        applicant_name: applicantName,
        checked_by_agent_id: agentId,
        check_date: form.check_date,
        result: form.result,
        listing_types: form.result === 'listed' ? form.listing_types : null,
        tica_reference: form.tica_reference || null,
        notes: form.notes || null,
      };
      let error;
      if (check) {
        ({ error } = await supabase
          .from('tica_checks' as any)
          .update(payload)
          .eq('id', check.id));
      } else {
        ({ error } = await supabase.from('tica_checks' as any).insert(payload));
      }
      if (error) throw error;
      toast.success('TICA check recorded');
      setOpen(false);
      fetchCheck();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const ResultBadge = () => {
    const r = check?.result;
    if (r === 'clear')
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Clear — No adverse history found
        </Badge>
      );
    if (r === 'listed')
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          Listed — Adverse history found
        </Badge>
      );
    if (r === 'unable_to_check')
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Unable to Check</Badge>
      );
    return <Badge variant="secondary">Not Checked</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck size={18} className="text-primary" />
          TICA Tenancy Database Check
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Check applicants against Australia's national tenancy database before approving.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <ExternalLink size={14} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>TICA checks are performed manually at tica.com.au — record the outcome below.</p>
            <a
              href="https://www.tica.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 font-medium underline"
            >
              Go to TICA <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !check ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <ResultBadge />
            <Button size="sm" onClick={openModal}>
              Record TICA Check
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <ResultBadge />
              <Button size="sm" variant="outline" onClick={openModal}>
                Update Check
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Check Date</p>
                <p className="font-medium">
                  {format(new Date(check.check_date), 'd MMM yyyy')}
                </p>
              </div>
              {check.tica_reference && (
                <div>
                  <p className="text-xs text-muted-foreground">TICA Reference</p>
                  <p className="font-medium font-mono text-xs">{check.tica_reference}</p>
                </div>
              )}
            </div>
            {check.result === 'listed' && check.listing_types && check.listing_types.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Listing Types</p>
                <div className="flex flex-wrap gap-1">
                  {check.listing_types.map((lt) => (
                    <Badge key={lt} variant="destructive" className="text-[10px]">
                      <AlertTriangle size={10} className="mr-1" />
                      {LISTING_OPTIONS.find((o) => o.value === lt)?.label || lt}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {check.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{check.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record TICA Check — {applicantName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Check Date</Label>
              <Input
                type="date"
                value={form.check_date}
                onChange={(e) => setForm((f) => ({ ...f, check_date: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-2 block">Result</Label>
              <RadioGroup
                value={form.result}
                onValueChange={(v) => setForm((f) => ({ ...f, result: v as any }))}
                className="space-y-2"
              >
                <label className="flex items-start gap-2 cursor-pointer rounded-md border p-2">
                  <RadioGroupItem value="clear" id="r-clear" className="mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Clear — No adverse history found</p>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer rounded-md border p-2">
                  <RadioGroupItem value="listed" id="r-listed" className="mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Listed — Adverse history recorded</p>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer rounded-md border p-2">
                  <RadioGroupItem value="unable_to_check" id="r-unable" className="mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">
                      Unable to Check — System unavailable / applicant not found
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {form.result === 'listed' && (
              <div>
                <Label className="mb-2 block">Listing Type (select all that apply)</Label>
                <div className="space-y-2">
                  {LISTING_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.listing_types.includes(opt.value)}
                        onCheckedChange={() => toggleListingType(opt.value)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>TICA Reference Number (optional)</Label>
              <Input
                placeholder="e.g. TICA-12345678"
                value={form.tica_reference}
                onChange={(e) => setForm((f) => ({ ...f, tica_reference: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                rows={3}
                placeholder="e.g. amount owed, property damaged, dates of listing"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Check'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function TICAStatusIcon({ result }: { result?: string | null }) {
  if (result === 'clear')
    return <ShieldCheck size={16} className="text-green-600" aria-label="TICA clear" />;
  if (result === 'listed')
    return <AlertTriangle size={16} className="text-red-600" aria-label="TICA listed" />;
  if (result === 'unable_to_check')
    return <HelpCircle size={16} className="text-amber-600" aria-label="TICA unable to check" />;
  return <span className="text-muted-foreground text-sm">—</span>;
}
