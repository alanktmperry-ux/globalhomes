import { Home, Building2, Warehouse, Mountain, Store, Minus, Plus, DollarSign, Key, Flame, Sun, Wind, Zap, Waves, ChevronDown, Gavel, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const TYPES = [
  { key: 'House', icon: <Home size={20} />, label: 'House' },
  { key: 'Apartment', icon: <Building2 size={20} />, label: 'Apt' },
  { key: 'Townhouse', icon: <Warehouse size={20} />, label: 'Town' },
  { key: 'Land', icon: <Mountain size={20} />, label: 'Land' },
  { key: 'Commercial', icon: <Store size={20} />, label: 'Comm' },
];

const LISTING_TYPES = [
  { key: 'sale' as const, icon: <DollarSign size={16} />, label: 'For Sale' },
  { key: 'rent' as const, icon: <Key size={16} />, label: 'For Rent' },
];

const PRICE_DISPLAYS = [
  { key: 'exact', label: 'Exact' },
  { key: 'range', label: 'Range' },
  { key: 'eoi', label: 'EOI' },
  { key: 'contact', label: 'Contact Agent' },
];

const GARAGE_TYPES = ['', 'Single Garage', 'Double Garage', 'DLUG', 'Remote Garage', 'Carport', 'Off-Street Parking'];
const AIRCON_TYPES = ['', 'Ducted', 'Split System', 'Evaporative', 'Multi-Split', 'Portable', 'None'];
const HEATING_TYPES = ['', 'Ducted Gas', 'Gas Log Fire', 'Hydronic', 'Electric Panel', 'In-Slab', 'Reverse Cycle', 'None'];
const PARKING_TYPES = ['', 'Included in rent', 'Street parking only', 'Basement/secured', 'Lock-up garage', 'Carport'];

const Counter = ({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) => (
  <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
    <span className="text-sm font-medium">{label}</span>
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors">
        <Minus size={14} />
      </button>
      <span className="font-display text-lg font-bold w-6 text-center">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors">
        <Plus size={14} />
      </button>
    </div>
  </div>
);

const ToggleRow = ({ label, value, onChange, sub }: { label: string; value: boolean; onChange: (v: boolean) => void; sub?: string }) => (
  <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
    <div className="flex-1">
      <span className="text-sm font-medium">{label}</span>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const SelectRow = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 appearance-none">
        {options.map(o => (
          <option key={o} value={o}>{o || '— Select —'}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  </div>
);

const SectionLabel = ({ children }: { children: string }) => (
  <h3 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-3">{children}</h3>
);

const formatPrice = (v: number) =>
  v >= 1000000 ? `$${(v / 1000000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${(v / 1000).toFixed(0)}K`;

const StepBasics = ({ draft, update }: Props) => {
  const isLand = draft.propertyType === 'Land';
  const isCommercial = draft.propertyType === 'Commercial';
  const isApartment = draft.propertyType === 'Apartment';
  const isRental = draft.listingType === 'rent';
  const showRange = draft.priceDisplay === 'range';
  const showAuction = draft.priceDisplay === 'eoi';

  // ── RENTAL: single source of truth is rentalWeekly; sync to priceMin/priceMax + auto-populate bond
  const handleRentChange = (raw: string) => {
    const val = Number(raw.replace(/,/g, '')) || 0;
    const prevAutoBond = (draft.rentalWeekly || 0) * 4;
    const currentBond = draft.bondAmount ?? 0;
    const isStillAuto = !draft.rentalWeekly || currentBond === 0 || currentBond === prevAutoBond;
    update({
      rentalWeekly: val,
      priceMin: val,
      priceMax: val,
      ...(isStillAuto ? { bondAmount: val * 4 } : {}),
    });
  };

  // ── SALE: track whether agent has manually overridden priceMax away from the auto-10%
  const handlePriceMinChange = (raw: string) => {
    const val = Number(raw.replace(/,/g, '')) || 0;
    const autoMax = Math.round(val * 1.1);
    const prevAutoMax = Math.round((draft.priceMin || 0) * 1.1);
    const isStillAuto = draft.priceMax === 0 || draft.priceMax === prevAutoMax;
    update({
      priceMin: val,
      priceMax: isStillAuto ? autoMax : draft.priceMax,
    });
  };

  const handlePriceMaxChange = (raw: string) => {
    const val = Number(raw.replace(/,/g, '')) || 0;
    update({ priceMax: val });
  };

  const resetPriceMaxToAuto = () => {
    if (draft.priceMin > 0) {
      update({ priceMax: Math.round(draft.priceMin * 1.1) });
    }
  };

  return (
    <div className="space-y-6">

      {/* Listing Type */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Listing Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {LISTING_TYPES.map(lt => (
            <button key={lt.key} type="button" onClick={() => {
              if (lt.key === 'rent' && draft.listingType !== 'rent') {
                update({ listingType: lt.key, priceMin: draft.rentalWeekly || 0, priceMax: draft.rentalWeekly || 0 });
              } else if (lt.key === 'sale' && draft.listingType !== 'sale') {
                update({ listingType: lt.key, priceMin: 500000, priceMax: 550000 });
              } else {
                update({ listingType: lt.key });
              }
            }} className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium ${draft.listingType === lt.key ? 'bg-primary/15 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'}`}>
              {lt.icon}
              {lt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Property Type</Label>
        <div className="grid grid-cols-5 gap-2">
          {TYPES.map(t => (
            <button key={t.key} type="button" onClick={() => update({ propertyType: t.key })} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-xs font-medium ${draft.propertyType === t.key ? 'bg-primary/15 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'}`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {draft.propertyType === 'House' && 'Standalone residential dwelling'}
          {draft.propertyType === 'Apartment' && 'Unit, flat, or apartment in a complex'}
          {draft.propertyType === 'Townhouse' && 'Multi-level attached dwelling'}
          {draft.propertyType === 'Land' && 'Vacant land or development site'}
          {draft.propertyType === 'Commercial' && 'Office, retail, warehouse, or mixed-use'}
        </p>
      </div>

      {/* ── PRICE ── */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">{isRental ? 'Rent per Week ($)' : 'Price ($)'}</Label>
        {isRental ? (
          <Input
            type="text"
            inputMode="numeric"
            value={draft.rentalWeekly ? draft.rentalWeekly.toLocaleString('en-AU') : ''}
            onChange={(e) => handleRentChange(e.target.value)}
            placeholder="e.g. 650"
            className="h-10"
          />
        ) : (
          <Input
            type="text"
            inputMode="numeric"
            value={draft.priceMin ? draft.priceMin.toLocaleString('en-AU') : ''}
            onChange={(e) => handlePriceMinChange(e.target.value)}
            placeholder="e.g. 1,200,000"
            className="h-10"
          />
        )}

        {/* Price To — only for Range */}
        {!isRental && showRange && (
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Price To ($) <span className="text-muted-foreground/60">— defaults to +10%, edit to override</span>
            </Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                value={draft.priceMax ? draft.priceMax.toLocaleString('en-AU') : ''}
                onChange={(e) => handlePriceMaxChange(e.target.value)}
                placeholder="e.g. 1,320,000"
                className="h-10 pr-16"
              />
              {/* Show "Auto" badge when priceMax equals the auto +10% value */}
              {draft.priceMin > 0 && draft.priceMax === Math.round(draft.priceMin * 1.1) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 select-none">
                  Auto +10%
                </span>
              )}
              {/* Show "Reset" link when agent has manually overridden */}
              {draft.priceMin > 0 && draft.priceMax > 0 && draft.priceMax !== Math.round(draft.priceMin * 1.1) && (
                <button
                  type="button"
                  onClick={resetPriceMaxToAuto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-primary hover:opacity-70 transition-opacity"
                >
                  Reset to auto
                </button>
              )}
            </div>
            {draft.priceMin > 0 && draft.priceMax > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Price guide will show: {formatPrice(draft.priceMin)} – {formatPrice(draft.priceMax)}
              </p>
            )}
          </div>
        )}

        {/* Price display mode */}
        {!isRental && (
          <div className="flex gap-1.5 mt-3">
            {PRICE_DISPLAYS.map(p => (
              <button key={p.key} type="button" onClick={() => update({ priceDisplay: p.key as ListingDraft['priceDisplay'] })} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${draft.priceDisplay === p.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border'}`}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Exact price preview */}
        {!isRental && draft.priceDisplay === 'exact' && draft.priceMax > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Displays as: {draft.priceMax.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <SectionLabel>Property Details</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Counter label={isCommercial ? 'Offices / Rooms' : 'Bedrooms'} value={draft.beds} onChange={(v) => update({ beds: v })} />
          <Counter label={isCommercial ? 'Washrooms' : 'Bathrooms'} value={draft.baths} onChange={(v) => update({ baths: v })} />
          <Counter label="Car Spaces" value={draft.cars} onChange={(v) => update({ cars: v })} />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Land Size (sqm) <span className="text-muted-foreground/70">optional</span>
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={draft.landSize ? String(draft.landSize) : ''}
              onChange={(e) => update({ landSize: Number(e.target.value.replace(/,/g, '')) || 0 })}
              placeholder="e.g. 650"
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold block">Description</Label>
          <Textarea
            value={draft.voiceTranscript}
            onChange={(e) => update({ voiceTranscript: e.target.value })}
            placeholder="Describe the property — key selling points, lifestyle, neighbourhood highlights…"
            className="min-h-[140px] resize-y"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            {draft.voiceTranscript.length > 0
              ? `${draft.voiceTranscript.length} characters`
              : 'You can also dictate this in the Voice step'}
          </p>
        </div>
      </div>

      {/* ── AUCTION DATE (EOI) ── */}
      {!isRental && showAuction && (
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Gavel size={16} className="text-primary" />
            <Label className="text-sm font-semibold">Auction Details</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Auction Date</Label>
              <Input type="date" value={draft.auctionDate} onChange={(e) => update({ auctionDate: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Auction Time</Label>
              <Input type="time" value={draft.auctionTime} onChange={(e) => update({ auctionTime: e.target.value })} className="h-9" />
            </div>
          </div>
        </div>
      )}

      {/* ── RENTAL DETAILS ── */}
      {isRental && (
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
          <Label className="text-sm font-semibold block">Rental Details</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Bond Amount ($)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={draft.bondAmount ? draft.bondAmount.toLocaleString('en-AU') : ''}
                onChange={(e) => update({ bondAmount: Number(e.target.value.replace(/,/g, '')) || 0 })}
                placeholder={draft.rentalWeekly ? `${(draft.rentalWeekly * 4).toLocaleString('en-AU')}` : 'e.g. 2,600'}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Standard bond is 4 weeks rent{draft.rentalWeekly > 0 ? ` ($${(draft.rentalWeekly * 4).toLocaleString('en-AU')})` : ''}. Adjust only if required by state law.
              </p>
              {draft.bondAmount > 0 && draft.rentalWeekly > 0 && draft.bondAmount !== draft.rentalWeekly * 4 && (
                <button
                  type="button"
                  onClick={() => update({ bondAmount: draft.rentalWeekly * 4 })}
                  className="text-[11px] font-medium text-primary hover:opacity-70 transition-opacity mt-1"
                >
                  Reset to 4 weeks (${(draft.rentalWeekly * 4).toLocaleString('en-AU')})
                </button>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Available From</Label>
              <Input type="date" value={draft.availableFrom} onChange={(e) => update({ availableFrom: e.target.value })} className="h-9" />
            </div>
          </div>
        </div>
      )}

      {/* ── AGENT COMMISSION (rental) ── */}
      {isRental && (
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-primary" />
            <Label className="text-sm font-semibold">Agent Commission</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Management Fee (%)</Label>
              <Input type="number" min={0} max={100} step={0.1} value={draft.commissionRate || ''} onChange={(e) => update({ commissionRate: Number(e.target.value) || 0 })} placeholder="e.g. 5.5" className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Letting Fee (weeks rent)</Label>
              <Input type="number" min={0} max={8} step={0.5} value={draft.lettingFeeWeeks || ''} onChange={(e) => update({ lettingFeeWeeks: Number(e.target.value) || 0 })} placeholder="e.g. 1" className="h-9" />
            </div>
          </div>
          {draft.rentalWeekly > 0 && (draft.commissionRate > 0 || draft.lettingFeeWeeks > 0) && (
            <div className="bg-background rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              {draft.commissionRate > 0 && (
                <p>Annual management income: <strong className="text-foreground">${((draft.rentalWeekly * 52 * draft.commissionRate) / 100).toLocaleString('en-AU', { maximumFractionDigits: 0 })}</strong> /yr</p>
              )}
              {draft.lettingFeeWeeks > 0 && (
                <p>Letting fee: <strong className="text-foreground">${(draft.rentalWeekly * draft.lettingFeeWeeks).toLocaleString('en-AU', { maximumFractionDigits: 0 })}</strong> per new tenancy</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ESTIMATED RENTAL (sale listings only) ── */}
      {!isRental && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Estimated Rental ($/week)</Label>
          <Input type="number" min={0} value={draft.estimatedRentalWeekly || ''} onChange={(e) => update({ estimatedRentalWeekly: Number(e.target.value) || 0 })} placeholder="e.g. 650 — helps investors assess yield" className="h-9" />
        </div>
      )}

      {/* ── EXTRA ROOM DETAILS ── */}
      {!isLand && !isCommercial && (
        <div className="space-y-2">
          <SectionLabel>Extra Room Details</SectionLabel>
          <Counter label="Ensuites" value={draft.ensuites} onChange={(v) => update({ ensuites: v })} />
          <Counter label="Study / Home Office" value={draft.studyRooms} onChange={(v) => update({ studyRooms: v })} />
        </div>
      )}

      {/* ── PARKING DETAILS ── */}
      {!isLand && (
        <div className="space-y-2">
          <SectionLabel>Parking Details</SectionLabel>
          {isRental ? (
            <SelectRow label="Parking Type" value={draft.rentalParkingType} onChange={(v) => update({ rentalParkingType: v })} options={PARKING_TYPES} />
          ) : (
            <SelectRow label="Garage Type" value={draft.garageType} onChange={(v) => update({ garageType: v })} options={GARAGE_TYPES} />
          )}
        </div>
      )}

      {/* ── OUTDOOR ── */}
      {!isLand && !isCommercial && (
        <div className="space-y-2">
          <SectionLabel>Outdoor</SectionLabel>
          <ToggleRow label="Swimming Pool" value={draft.hasPool} onChange={(v) => update({ hasPool: v })} />
          <ToggleRow label="Outdoor Entertaining" value={draft.hasOutdoorEnt} onChange={(v) => update({ hasOutdoorEnt: v })} sub={isRental ? undefined : 'BBQ area, patio, pergola'} />
          {!isApartment && (
            <ToggleRow label="Alfresco Area" value={draft.hasAlfresco} onChange={(v) => update({ hasAlfresco: v })} />
          )}
          {isApartment && (
            <ToggleRow label="Balcony" value={draft.hasBalcony} onChange={(v) => update({ hasBalcony: v })} />
          )}
        </div>
      )}

      {/* ── CLIMATE ── */}
      {!isLand && (
        <div className="space-y-2">
          <SectionLabel>Climate Control</SectionLabel>
          {isRental ? (
            <ToggleRow label="Air Conditioning" value={draft.hasAirCon} onChange={(v) => update({ hasAirCon: v })} />
          ) : (
            <>
              <SelectRow label="Air Conditioning" value={draft.airConType} onChange={(v) => update({ airConType: v })} options={AIRCON_TYPES} />
              <SelectRow label="Heating" value={draft.heatingType} onChange={(v) => update({ heatingType: v })} options={HEATING_TYPES} />
              <ToggleRow label="Solar Panels" value={draft.hasSolar} onChange={(v) => update({ hasSolar: v })} sub="Solar power system installed" />
            </>
          )}
        </div>
      )}

      {/* ── INCLUSIONS (rental) ── */}
      {isRental && (
        <div className="space-y-2">
          <SectionLabel>Inclusions in Rent</SectionLabel>
          <ToggleRow label="Water Included" value={draft.waterIncluded} onChange={(v) => update({ waterIncluded: v })} />
          <ToggleRow label="Electricity Included" value={draft.electricityIncluded} onChange={(v) => update({ electricityIncluded: v })} />
          <ToggleRow label="Internet Included" value={draft.internetIncluded} onChange={(v) => update({ internetIncluded: v })} />
        </div>
      )}

      {/* ── APPLIANCES (rental) ── */}
      {isRental && (
        <div className="space-y-2">
          <SectionLabel>Appliances & Laundry</SectionLabel>
          <ToggleRow label="Internal Laundry" value={draft.hasInternalLaundry} onChange={(v) => update({ hasInternalLaundry: v })} />
          <ToggleRow label="Dishwasher" value={draft.hasDishwasher} onChange={(v) => update({ hasDishwasher: v })} />
          <ToggleRow label="Washing Machine" value={draft.hasWashingMachine} onChange={(v) => update({ hasWashingMachine: v })} />
        </div>
      )}

      {/* ── FACILITIES (rental) ── */}
      {isRental && !isLand && (
        <div className="space-y-2">
          <SectionLabel>Building Facilities</SectionLabel>
          <ToggleRow label="Pool Access" value={draft.hasPoolAccess} onChange={(v) => update({ hasPoolAccess: v })} />
          <ToggleRow label="Gym Access" value={draft.hasGymAccess} onChange={(v) => update({ hasGymAccess: v })} />
        </div>
      )}

      {/* ── TENANCY RULES (rental) ── */}
      {isRental && (
        <div className="space-y-2">
          <SectionLabel>Tenancy Rules</SectionLabel>
          <ToggleRow label="Smoking Allowed" value={draft.smokingAllowed} onChange={(v) => update({ smokingAllowed: v })} sub="Toggle on if smoking is allowed on premises" />
          <div className="bg-secondary rounded-xl px-4 py-3">
            <Label className="text-xs text-muted-foreground mb-1 block">Maximum Occupants</Label>
            <Input type="number" min={0} value={draft.maxOccupants || ''} onChange={(e) => update({ maxOccupants: Number(e.target.value) || 0 })} placeholder="0 = no limit" className="h-9" />
          </div>
        </div>
      )}

      {/* ── FLOOR AREA ── */}
      {!isLand && (
        <div className="space-y-2">
          <SectionLabel>Floor Area</SectionLabel>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Floor Area (sqm)</Label>
            <Input type="number" min={0} value={draft.sqm || ''} onChange={(e) => update({ sqm: Number(e.target.value) || 0 })} placeholder="e.g. 180" className="h-9" />
          </div>
        </div>
      )}

      {/* ── FINANCIAL DETAILS (sale) ── */}
      {!isRental && !isLand && (
        <div className="space-y-2">
          <SectionLabel>Financial Details (optional)</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Year Built</Label>
              <Input type="text" inputMode="numeric" value={draft.yearBuilt} onChange={(e) => update({ yearBuilt: e.target.value })} placeholder="e.g. 2005" className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Council Rates ($/yr)</Label>
              <Input type="number" min={0} value={draft.councilRates || ''} onChange={(e) => update({ councilRates: Number(e.target.value) || 0 })} placeholder="e.g. 1800" className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Water Rates ($/yr)</Label>
              <Input type="number" min={0} value={draft.waterRates || ''} onChange={(e) => update({ waterRates: Number(e.target.value) || 0 })} placeholder="e.g. 900" className="h-9" />
            </div>
            {(isApartment || draft.propertyType === 'Townhouse') && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Strata / OC Fees ($/qtr)</Label>
                <Input type="number" min={0} value={draft.strataFees || ''} onChange={(e) => update({ strataFees: Number(e.target.value) || 0 })} placeholder="e.g. 900" className="h-9" />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default StepBasics;
