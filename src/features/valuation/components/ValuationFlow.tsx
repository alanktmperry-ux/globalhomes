import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete, type AddressParts } from '@/components/ui/AddressAutocomplete';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { Home, Building2, Building, Check, Loader2, ShieldCheck, Globe2, Clock } from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5;
type PropertyType = 'house' | 'unit' | 'townhouse';
type Renovations = 'no' | 'partial' | 'yes';
type ContactMethod = 'email' | 'sms' | 'call';

interface Estimate {
  min: number;
  max: number;
  mid: number;
  base: number;
  method: string;
  sample_size: number;
}

interface Props {
  initialAddress?: string;
  /** Compact variant used inside the homepage hero (no progress bar). */
  compact?: boolean;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;

export function ValuationFlow({ initialAddress = '', compact = false }: Props) {
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [addressRaw, setAddressRaw] = useState(initialAddress);
  const [address, setAddress] = useState<AddressParts | null>(null);

  const [propertyType, setPropertyType] = useState<PropertyType>('house');
  const [beds, setBeds] = useState<number>(3);
  const [baths, setBaths] = useState<number>(2);
  const [cars, setCars] = useState<number>(1);
  const [landSize, setLandSize] = useState<string>('');
  const [renovations, setRenovations] = useState<Renovations>('no');

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToEstimate = async () => {
    if (!address) return;
    setEstimating(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('estimate_property_value', {
        p_suburb: address.suburb,
        p_state: address.state,
        p_property_type: propertyType,
        p_beds: beds,
        p_baths: baths,
        p_land_size_sqm: landSize ? parseInt(landSize, 10) || null : null,
        p_renovations: renovations,
      });
      if (rpcErr) throw rpcErr;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const est: Estimate = {
        min: Number(parsed.min),
        max: Number(parsed.max),
        mid: Number(parsed.mid),
        base: Number(parsed.base),
        method: parsed.method,
        sample_size: Number(parsed.sample_size ?? 0),
      };
      setEstimate(est);

      // Log the anonymous estimate (fire-and-forget)
      void supabase.from('valuation_estimates').insert({
        address: address.address,
        suburb: address.suburb,
        state: address.state,
        postcode: address.postcode,
        property_type: propertyType,
        beds,
        baths,
        cars,
        land_size_sqm: landSize ? parseInt(landSize, 10) || null : null,
        renovations,
        estimated_value_min: est.min,
        estimated_value_max: est.max,
        base_value: est.base,
        method: est.method,
        calculation_metadata: { sample_size: est.sample_size, language },
      });

      setStep(3);
    } catch (e) {
      console.error(e);
      setError(t('valuation.error.submit'));
    } finally {
      setEstimating(false);
    }
  };

  const submitLead = async () => {
    if (!address || !estimate) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError(t('valuation.error.required'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: fnErr } = await supabase.functions.invoke('submit-seller-lead', {
        body: {
          address: address.address,
          suburb: address.suburb,
          state: address.state,
          postcode: address.postcode,
          lat: address.lat,
          lng: address.lng,
          property_type: propertyType,
          beds,
          baths,
          cars,
          land_size_sqm: landSize ? parseInt(landSize, 10) || null : null,
          renovations,
          estimated_value_min: estimate.min,
          estimated_value_max: estimate.max,
          estimate_method: estimate.method,
          user_name: name.trim(),
          user_email: email.trim(),
          user_phone: phone.trim(),
          preferred_contact: contactMethod,
          preferred_language: language,
        },
      });
      if (fnErr) throw fnErr;
      setStep(5);
    } catch (e) {
      console.error(e);
      setError(t('valuation.error.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  const numberPicker = (
    value: number, setValue: (n: number) => void, options: number[], suffix?: string,
  ) => (
    <div className="flex flex-wrap gap-2">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setValue(n)}
          className={`min-w-[44px] h-11 px-3 rounded-lg border text-sm font-medium transition ${
            value === n
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          {n}{suffix}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!compact && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>{t('valuation.step.of', { current: Math.min(step, 4), total: 4 })}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        {/* STEP 1 — Address */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('valuation.step1.title')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('valuation.step1.help')}</p>
            </div>
            <AddressAutocomplete
              value={addressRaw}
              onChange={setAddressRaw}
              onSelect={(parts) => {
                setAddress(parts);
                setAddressRaw(parts.address);
              }}
              placeholder={t('valuation.step1.placeholder')}
            />
            <div className="flex justify-end">
              <Button disabled={!address} onClick={() => setStep(2)}>
                {t('valuation.next')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Property details */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">{t('valuation.step2.title')}</h2>

            <div>
              <Label className="text-sm text-slate-700">{t('valuation.step2.type')}</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {([
                  ['house', Home, t('valuation.step2.type.house')],
                  ['unit', Building2, t('valuation.step2.type.unit')],
                  ['townhouse', Building, t('valuation.step2.type.townhouse')],
                ] as const).map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPropertyType(key)}
                    className={`min-h-[88px] flex flex-col items-center justify-center gap-1 rounded-lg border text-sm font-medium transition ${
                      propertyType === key
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-700">{t('valuation.step2.beds')}</Label>
              <div className="mt-2">{numberPicker(beds, setBeds, [1, 2, 3, 4, 5, 6])}</div>
            </div>
            <div>
              <Label className="text-sm text-slate-700">{t('valuation.step2.baths')}</Label>
              <div className="mt-2">{numberPicker(baths, setBaths, [1, 2, 3, 4])}</div>
            </div>
            <div>
              <Label className="text-sm text-slate-700">{t('valuation.step2.cars')}</Label>
              <div className="mt-2">{numberPicker(cars, setCars, [0, 1, 2, 3])}</div>
            </div>
            <div>
              <Label htmlFor="land-size" className="text-sm text-slate-700">
                {t('valuation.step2.land')}
              </Label>
              <Input
                id="land-size"
                inputMode="numeric"
                value={landSize}
                onChange={(e) => setLandSize(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={t('valuation.step2.landUnknown')}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm text-slate-700">{t('valuation.step2.renovations')}</Label>
              <div className="mt-2 flex gap-2">
                {(['no', 'partial', 'yes'] as Renovations[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRenovations(r)}
                    className={`flex-1 min-h-[44px] rounded-lg border text-sm font-medium transition ${
                      renovations === r
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t(`valuation.step2.reno.${r}` as 'valuation.step2.reno.no')}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>{t('valuation.back')}</Button>
              <Button onClick={goToEstimate} disabled={estimating}>
                {estimating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('valuation.next')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Estimate display */}
        {step === 3 && estimate && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t('valuation.estimate.title')}
              </h2>
              <p className="mt-3 text-4xl md:text-5xl font-bold text-slate-900">
                {fmt(estimate.min)} – {fmt(estimate.max)}
              </p>
              {address && (
                <p className="mt-2 text-sm text-slate-500">{address.address}</p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700 mb-1">
                {t('valuation.estimate.comparables')}
              </p>
              <p className="text-xs text-slate-500">
                {estimate.sample_size > 0
                  ? `Based on ${estimate.sample_size} recent sales in ${address?.suburb}.`
                  : t('valuation.estimate.noComparables')}
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {t('valuation.estimate.disclaimer')}
            </p>

            <div className="flex flex-wrap gap-3 justify-center text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-blue-600" />{t('valuation.trust.free')}</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 className="h-4 w-4 text-blue-600" />{t('valuation.trust.language')}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-blue-600" />{t('valuation.trust.fast')}</span>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>{t('valuation.back')}</Button>
              <Button onClick={() => setStep(4)} className="flex-1 sm:flex-none">
                {t('valuation.estimate.cta')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 — Lead capture */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('valuation.leadcapture.title')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('valuation.leadcapture.subtitle')}</p>
            </div>
            <div>
              <Label htmlFor="lead-name">{t('valuation.leadcapture.name')}</Label>
              <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lead-email">{t('valuation.leadcapture.email')}</Label>
              <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lead-phone">{t('valuation.leadcapture.phone')}</Label>
              <Input id="lead-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm text-slate-700">{t('valuation.leadcapture.contactmethod')}</Label>
              <div className="mt-2 flex gap-2">
                {(['email', 'sms', 'call'] as ContactMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setContactMethod(m)}
                    className={`flex-1 min-h-[44px] rounded-lg border text-sm font-medium transition ${
                      contactMethod === m
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t(`valuation.leadcapture.contact.${m}` as 'valuation.leadcapture.contact.email')}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>{t('valuation.back')}</Button>
              <Button onClick={submitLead} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t('valuation.leadcapture.submitting')}</>
                ) : t('valuation.leadcapture.submit')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5 — Success */}
        {step === 5 && (
          <div className="text-center space-y-5 py-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('valuation.success.title')}</h2>
              <p className="text-sm text-slate-600 mt-2">{t('valuation.success.message')}</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/buy')}>
              {t('valuation.success.browse')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ValuationFlow;
