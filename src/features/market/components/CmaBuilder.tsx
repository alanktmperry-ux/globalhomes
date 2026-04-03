import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import type { AddressParts } from '@/components/ui/AddressAutocomplete';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCmaReports } from '../hooks/useCmaReport';
import { ComparableSaleCard } from './ComparableSaleCard';
import type { ComparableSaleRecord } from '@/types/market';

const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

interface Props {
  prefilledPropertyId?: string;
  prefilledAddress?: string;
  prefilledSuburb?: string;
  prefilledState?: string;
  prefilledPostcode?: string;
  prefilledBedrooms?: number;
  prefilledBathrooms?: number;
  prefilledCarSpaces?: number;
  prefilledLandSqm?: number;
  prefilledPropertyType?: string;
}

export function CmaBuilder(props: Props) {
  const navigate = useNavigate();
  const { createReport } = useCmaReports();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Subject
  const [address, setAddress] = useState(props.prefilledAddress ?? '');
  const [suburbInput, setSuburbInput] = useState(props.prefilledSuburb ?? '');
  const [stateInput, setStateInput] = useState(props.prefilledState ?? '');
  const [postcode, setPostcode] = useState(props.prefilledPostcode ?? '');
  const [propertyType, setPropertyType] = useState(props.prefilledPropertyType ?? 'house');
  const [bedrooms, setBedrooms] = useState(props.prefilledBedrooms ?? 3);
  const [bathrooms, setBathrooms] = useState(props.prefilledBathrooms ?? 2);
  const [carSpaces, setCarSpaces] = useState(props.prefilledCarSpaces ?? 2);
  const [landSqm, setLandSqm] = useState(props.prefilledLandSqm?.toString() ?? '');
  const [radiusKm, setRadiusKm] = useState(2);
  const [monthsBack, setMonthsBack] = useState(12);

  // Step 2 — Comparables
  const [comparables, setComparables] = useState<ComparableSaleRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingComps, setLoadingComps] = useState(false);

  // Step 3 — Valuation
  const [priceLow, setPriceLow] = useState('');
  const [priceMid, setPriceMid] = useState('');
  const [priceHigh, setPriceHigh] = useState('');
  const [recommendedPrice, setRecommendedPrice] = useState('');
  const [recommendedMethod, setRecommendedMethod] = useState('private_treaty');
  const [commentary, setCommentary] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [preparedForEmail, setPreparedForEmail] = useState('');
  const [reportTitle, setReportTitle] = useState('Comparative Market Analysis');

  const fetchComparables = async () => {
    if (!suburbInput || !stateInput) return;
    setLoadingComps(true);
    const { data } = await supabase.rpc('get_comparable_sales', {
      p_suburb: suburbInput,
      p_state: stateInput,
      p_property_type: propertyType || null,
      p_bedrooms: bedrooms,
      p_months_back: monthsBack,
      p_limit: 20,
      p_offset: 0,
    });
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const sales = (parsed?.sales ?? []) as ComparableSaleRecord[];
    setComparables(sales);
    // Pre-select top 5 by default
    const preSelected = new Set(sales.slice(0, 5).map(s => s.id));
    setSelectedIds(preSelected);

    // Auto-calc prices
    if (sales.length >= 3) {
      const prices = sales.filter(s => preSelected.has(s.id)).map(s => s.sold_price).sort((a, b) => a - b);
      const p10 = prices[Math.floor(prices.length * 0.1)] ?? prices[0];
      const med = prices[Math.floor(prices.length * 0.5)];
      const p90 = prices[Math.ceil(prices.length * 0.9) - 1] ?? prices[prices.length - 1];
      setPriceLow(Math.round(p10).toString());
      setPriceMid(Math.round(med).toString());
      setPriceHigh(Math.round(p90).toString());
      setRecommendedPrice(Math.round(med).toString());
    }
    setLoadingComps(false);
  };

  const toggleComp = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Must be signed in'); setSaving(false); return; }

    const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
    if (!agent) { toast.error('Agent profile required'); setSaving(false); return; }

    const { data: report, error } = await createReport({
      agent_id: agent.id,
      property_id: props.prefilledPropertyId || undefined,
      subject_address: address,
      subject_suburb: suburbInput,
      subject_state: stateInput,
      subject_postcode: postcode,
      subject_bedrooms: bedrooms,
      subject_bathrooms: bathrooms,
      subject_car_spaces: carSpaces,
      subject_land_sqm: landSqm ? parseFloat(landSqm) : undefined,
      subject_property_type: propertyType,
      radius_km: radiusKm,
      months_back: monthsBack,
      selected_comparable_ids: Array.from(selectedIds),
      estimated_price_low: priceLow ? parseFloat(priceLow) : undefined,
      estimated_price_mid: priceMid ? parseFloat(priceMid) : undefined,
      estimated_price_high: priceHigh ? parseFloat(priceHigh) : undefined,
      agent_recommended_price: recommendedPrice ? parseFloat(recommendedPrice) : undefined,
      agent_recommended_method: recommendedMethod,
      agent_commentary: commentary || undefined,
      report_title: reportTitle,
      vendor_name: vendorName || undefined,
      prepared_for_email: preparedForEmail || undefined,
    } as any);

    if (error) {
      toast.error('Failed to create CMA');
    } else {
      toast.success('CMA report created!');
      navigate(`/dashboard/cma/${report?.id}`);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-secondary'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Subject Property</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Address</Label><AddressAutocomplete value={address} onChange={setAddress} onSelect={(parts) => { setAddress(parts.address); if (parts.suburb) setSuburbInput(parts.suburb); if (parts.state) setStateInput(parts.state); if (parts.postcode) setPostcode(parts.postcode); }} placeholder="Start typing an address…" /></div>
            <div><Label>Suburb</Label><Input value={suburbInput} onChange={e => setSuburbInput(e.target.value)} /></div>
            <div><Label>State</Label><Input value={stateInput} onChange={e => setStateInput(e.target.value)} placeholder="VIC" /></div>
            <div><Label>Postcode</Label><Input value={postcode} onChange={e => setPostcode(e.target.value)} /></div>
            <div>
              <Label>Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['house', 'unit', 'townhouse', 'land', 'apartment'].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Bedrooms</Label><Input type="number" value={bedrooms} onChange={e => setBedrooms(+e.target.value)} /></div>
            <div><Label>Bathrooms</Label><Input type="number" value={bathrooms} onChange={e => setBathrooms(+e.target.value)} /></div>
            <div><Label>Car Spaces</Label><Input type="number" value={carSpaces} onChange={e => setCarSpaces(+e.target.value)} /></div>
            <div><Label>Land Size (m²)</Label><Input value={landSqm} onChange={e => setLandSqm(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Search Radius: {radiusKm} km</Label>
            <Slider value={[radiusKm]} onValueChange={([v]) => setRadiusKm(v)} min={0.5} max={10} step={0.5} />
          </div>
          <div>
            <Label>Look-back Period</Label>
            <Select value={monthsBack.toString()} onValueChange={v => setMonthsBack(+v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[6, 12, 18, 24].map(m => <SelectItem key={m} value={m.toString()}>{m} months</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { fetchComparables(); setStep(2); }} disabled={!address || !suburbInput || !stateInput} className="gap-1.5">
            Next — Find Comparables <ChevronRight size={14} />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Select Comparables</h2>
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          </div>
          {selectedIds.size < 3 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">⚠ Select at least 3 comparables for a strong analysis.</p>
          )}
          {loadingComps ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin" size={24} /></div>
          ) : comparables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No comparables found. Try a wider radius or longer period.</p>
          ) : (
            <div className="space-y-2">
              {comparables.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleComp(c.id)} className="mt-4" />
                  <div className="flex-1"><ComparableSaleCard sale={c} compact /></div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5"><ChevronLeft size={14} /> Back</Button>
            <Button onClick={() => setStep(3)} disabled={selectedIds.size === 0} className="gap-1.5">
              Next — Valuation <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Valuation & Notes</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Estimated Low</Label><Input type="number" value={priceLow} onChange={e => setPriceLow(e.target.value)} /></div>
            <div><Label>Estimated Mid</Label><Input type="number" value={priceMid} onChange={e => setPriceMid(e.target.value)} /></div>
            <div><Label>Estimated High</Label><Input type="number" value={priceHigh} onChange={e => setPriceHigh(e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Recommended Price</Label><Input type="number" value={recommendedPrice} onChange={e => setRecommendedPrice(e.target.value)} /></div>
            <div>
              <Label>Sale Method</Label>
              <Select value={recommendedMethod} onValueChange={setRecommendedMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private_treaty">Private Treaty</SelectItem>
                  <SelectItem value="auction">Auction</SelectItem>
                  <SelectItem value="expression_of_interest">EOI</SelectItem>
                  <SelectItem value="set_date_sale">Set Date Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Agent Commentary</Label><Textarea value={commentary} onChange={e => setCommentary(e.target.value)} rows={4} placeholder="Market insights, property strengths, recommended strategy..." /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Vendor Name</Label><Input value={vendorName} onChange={e => setVendorName(e.target.value)} /></div>
            <div><Label>Prepared For (Email)</Label><Input type="email" value={preparedForEmail} onChange={e => setPreparedForEmail(e.target.value)} /></div>
          </div>
          <div><Label>Report Title</Label><Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} /></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5"><ChevronLeft size={14} /> Back</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Create CMA Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
