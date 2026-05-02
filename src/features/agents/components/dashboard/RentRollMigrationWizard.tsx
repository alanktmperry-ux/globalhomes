import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload, CheckCircle2, FileText, ArrowRight, ArrowLeft, AlertTriangle,
  Loader2, Download, Printer, Database, FileUp, ListChecks, Building2, Users,
  Banknote, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_AU = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

// ── Source systems ──
type CsvFormat =
  | 'propertyme' | 'console_cloud' | 'rockend_rest'
  | 'propertytree' | 'reapit' | 'trustsoft' | 'generic';

const SOURCE_SYSTEMS: { id: CsvFormat; label: string; tagline: string }[] = [
  { id: 'propertyme', label: 'PropertyMe', tagline: 'Most common — cloud-based' },
  { id: 'console_cloud', label: 'Console Cloud', tagline: 'MRI Console Cloud' },
  { id: 'rockend_rest', label: 'Rockend REST', tagline: 'Legacy desktop' },
  { id: 'propertytree', label: 'PropertyTree', tagline: 'MRI cloud PM' },
  { id: 'reapit', label: 'Reapit', tagline: 'Sales + PM' },
  { id: 'trustsoft', label: 'TrustSoft', tagline: 'Trust accounting' },
  { id: 'generic', label: 'Generic CSV', tagline: 'Any other system' },
];

const HELPER_RENT_ROLL: Record<CsvFormat, string> = {
  propertyme: 'Reports → Rent Roll → Export to CSV',
  console_cloud: 'Reports → Management → Rent Roll Report → Export',
  rockend_rest: 'Reports → Property Management → Rent Roll → Export',
  propertytree: 'Reports → Rent Roll → Export CSV',
  reapit: 'Properties → Export → Rent Roll',
  trustsoft: 'Reports → Properties Under Management → CSV',
  generic: 'One row per tenancy. See template below.',
};

const HELPER_OWNERS: Record<CsvFormat, string> = {
  propertyme: 'Contacts → Owners → Export → All Owners',
  console_cloud: 'Contacts → Owners → Export',
  rockend_rest: 'Owners → Export All',
  propertytree: 'Contacts → Owners → Export',
  reapit: 'Contacts → Landlords → Export',
  trustsoft: 'Contacts → Owners → Export',
  generic: 'One row per owner.',
};

const HELPER_TENANTS: Record<CsvFormat, string> = {
  propertyme: 'Contacts → Tenants → Export → All Tenants',
  console_cloud: 'Contacts → Tenants → Export',
  rockend_rest: 'Tenants → Export All',
  propertytree: 'Contacts → Tenants → Export',
  reapit: 'Contacts → Tenants → Export',
  trustsoft: 'Contacts → Tenants → Export',
  generic: 'One row per tenant.',
};

// Sample headers per source
const SAMPLE_HEADERS: Record<CsvFormat, { rentRoll: string[]; owners: string[]; tenants: string[] }> = {
  propertyme: {
    rentRoll: ['PropertyAddress', 'OwnerName', 'TenantName', 'WeeklyRent', 'RentFrequency', 'LeaseStart', 'LeaseEnd', 'BondAmount', 'PaidToDate', 'ManagementFee%', 'BondLodgementNumber', 'BondAuthority', 'LettingFeeWeeks', 'LeaseType', 'VacatingDate', 'PropertyType', 'Beds', 'Baths', 'LedgerBalance'],
    owners: ['OwnerName', 'Email', 'Phone', 'BSB', 'AccountNumber', 'AccountName', 'ABN', 'GST', 'Address'],
    tenants: ['TenantName', 'Email', 'Phone', 'EmergencyName', 'EmergencyPhone', 'EmergencyRelationship', 'DOB', 'EmployerName', 'EmployerPhone'],
  },
  console_cloud: {
    rentRoll: ['Property Address', 'Owner', 'Tenant', 'Rent', 'Frequency', 'Lease Start', 'Lease End', 'Bond', 'Paid To', 'Mgmt Fee %', 'Bond Number', 'Bond Authority', 'Letting Fee', 'Lease Type', 'Vacating', 'Type', 'Beds', 'Baths', 'Ledger Balance'],
    owners: ['Owner Name', 'Email', 'Phone', 'BSB', 'Account No', 'Account Name', 'ABN', 'GST Reg', 'Address'],
    tenants: ['Tenant Name', 'Email', 'Phone', 'Emergency Name', 'Emergency Phone', 'Emergency Relationship', 'DOB', 'Employer', 'Employer Phone'],
  },
  rockend_rest: {
    rentRoll: ['Address', 'Owner', 'Tenant', 'Rent', 'Freq', 'Start', 'End', 'Bond', 'PaidTo', 'MgmtFee', 'BondNo', 'Authority', 'LetFee', 'LeaseType', 'Vacating', 'Type', 'Bed', 'Bath', 'Balance'],
    owners: ['Name', 'Email', 'Phone', 'BSB', 'AcctNo', 'AcctName', 'ABN', 'GST', 'Address'],
    tenants: ['Name', 'Email', 'Phone', 'EmgName', 'EmgPhone', 'EmgRel', 'DOB', 'Employer', 'EmpPhone'],
  },
  propertytree: {
    rentRoll: ['property_address', 'owner_name', 'tenant_name', 'rent_amount', 'rent_frequency', 'lease_start', 'lease_end', 'bond_amount', 'rent_paid_to_date', 'management_fee_pct', 'bond_lodgement_number', 'bond_authority', 'letting_fee_weeks', 'lease_type', 'vacating_date', 'property_type', 'beds', 'baths', 'ledger_balance'],
    owners: ['owner_name', 'email', 'phone', 'bsb', 'account_number', 'account_name', 'abn', 'gst_registered', 'address'],
    tenants: ['tenant_name', 'email', 'phone', 'emergency_name', 'emergency_phone', 'emergency_relationship', 'dob', 'employer_name', 'employer_phone'],
  },
  reapit: {
    rentRoll: ['Address', 'Landlord', 'Tenant', 'Rent', 'Period', 'Lease Start', 'Lease End', 'Bond', 'Paid To Date', 'Fee %', 'Bond Ref', 'Authority', 'Letting Fee', 'Type', 'Vacate Date', 'Property Type', 'Beds', 'Baths', 'Balance'],
    owners: ['Landlord Name', 'Email', 'Phone', 'BSB', 'Account', 'Acct Name', 'ABN', 'GST', 'Address'],
    tenants: ['Tenant', 'Email', 'Phone', 'NOK Name', 'NOK Phone', 'NOK Relationship', 'DOB', 'Employer', 'Employer Phone'],
  },
  trustsoft: {
    rentRoll: ['PropAddress', 'OwnerRef', 'TenantRef', 'Rent', 'Freq', 'LStart', 'LEnd', 'BondAmt', 'PaidTo', 'MgmtPct', 'BondLodge', 'BondAuth', 'LetFeeWks', 'LeaseTyp', 'VacateDt', 'PropType', 'Beds', 'Baths', 'LedgBal'],
    owners: ['OwnerRef', 'Email', 'Phone', 'BSB', 'AcctNum', 'AcctName', 'ABN', 'GSTReg', 'Address'],
    tenants: ['TenantRef', 'Email', 'Phone', 'EmgName', 'EmgPhone', 'EmgRel', 'DOB', 'EmpName', 'EmpPhone'],
  },
  generic: {
    rentRoll: ['property_address', 'owner_name', 'tenant_name', 'rent_amount', 'rent_frequency', 'lease_start', 'lease_end', 'bond_amount', 'rent_paid_to_date', 'management_fee_pct', 'bond_lodgement_number', 'bond_authority', 'letting_fee_weeks', 'lease_type', 'vacating_date', 'property_type', 'beds', 'baths', 'ledger_balance'],
    owners: ['owner_name', 'email', 'phone', 'bsb', 'account_number', 'account_name', 'abn', 'gst_registered', 'address'],
    tenants: ['tenant_name', 'email', 'phone', 'emergency_name', 'emergency_phone', 'emergency_relationship', 'dob', 'employer_name', 'employer_phone'],
  },
};

// ── ListHQ field schema ──
type RentRollField =
  | 'property_address' | 'owner_name' | 'tenant_name' | 'rent_amount' | 'rent_frequency'
  | 'lease_start' | 'lease_end' | 'bond_amount' | 'rent_paid_to_date' | 'management_fee_pct'
  | 'bond_lodgement_number' | 'bond_authority' | 'letting_fee_weeks' | 'lease_type'
  | 'vacating_date' | 'property_type' | 'beds' | 'baths' | 'ledger_balance';

const RENT_ROLL_FIELDS: { id: RentRollField; label: string; required: boolean }[] = [
  { id: 'property_address', label: 'Property Address', required: true },
  { id: 'owner_name', label: 'Owner Name', required: true },
  { id: 'tenant_name', label: 'Tenant Name', required: true },
  { id: 'rent_amount', label: 'Rent Amount', required: true },
  { id: 'rent_frequency', label: 'Rent Frequency', required: true },
  { id: 'lease_start', label: 'Lease Start Date', required: true },
  { id: 'lease_end', label: 'Lease End Date', required: true },
  { id: 'bond_amount', label: 'Bond Amount', required: true },
  { id: 'rent_paid_to_date', label: 'Rent Paid To Date', required: true },
  { id: 'management_fee_pct', label: 'Management Fee %', required: true },
  { id: 'bond_lodgement_number', label: 'Bond Lodgement Number', required: false },
  { id: 'bond_authority', label: 'Bond Authority', required: false },
  { id: 'letting_fee_weeks', label: 'Letting Fee (weeks)', required: false },
  { id: 'lease_type', label: 'Lease Type', required: false },
  { id: 'vacating_date', label: 'Vacating Date', required: false },
  { id: 'property_type', label: 'Property Type', required: false },
  { id: 'beds', label: 'Bedrooms', required: false },
  { id: 'baths', label: 'Bathrooms', required: false },
  { id: 'ledger_balance', label: 'Ledger Balance', required: false },
];

// ── CSV utils ──
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const split = (line: string) => line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
  const headers = split(lines[0]);
  const rows = lines.slice(1).map(l => {
    const cols = split(l);
    const r: Record<string, string> = {};
    headers.forEach((h, i) => { r[h] = cols[i] ?? ''; });
    return r;
  });
  return { headers, rows };
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  // DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  // DD-Mon-YYYY
  const dMonY = trimmed.match(/^(\d{1,2})[\-\s](\w{3})[\-\s](\d{4})$/);
  if (dMonY) {
    const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    return `${dMonY[3]}-${months[dMonY[2].toLowerCase()] || '01'}-${dMonY[1].padStart(2, '0')}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function num(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeFreq(raw: string): 'weekly' | 'fortnightly' | 'monthly' {
  const l = (raw || '').toLowerCase();
  if (l.startsWith('fort') || l === '2w' || l === 'biweekly') return 'fortnightly';
  if (l.startsWith('mon') || l === 'm') return 'monthly';
  return 'weekly';
}

function parseAddress(addr: string): { suburb: string; state: string; postcode: string } {
  // try to match "..., Suburb STATE 1234"
  const m = (addr || '').match(/,\s*([^,]+?)\s+([A-Z]{2,3})\s+(\d{4})\s*$/);
  if (m) return { suburb: m[1].trim(), state: m[2], postcode: m[3] };
  return { suburb: '', state: '', postcode: '' };
}

function autoMapColumns(csvHeaders: string[]): Record<RentRollField, string> {
  const map = {} as Record<RentRollField, string>;
  const lower = csvHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const find = (...patterns: string[]) => {
    for (const p of patterns) {
      const idx = lower.findIndex(h => h.includes(p));
      if (idx !== -1) return csvHeaders[idx];
    }
    return '';
  };
  map.property_address = find('propertyaddress', 'address');
  map.owner_name = find('ownername', 'owner', 'landlord');
  map.tenant_name = find('tenantname', 'tenant');
  map.rent_amount = find('rentamount', 'weeklyrent', 'rent');
  map.rent_frequency = find('rentfrequency', 'frequency', 'period', 'freq');
  map.lease_start = find('leasestart', 'lstart', 'start');
  map.lease_end = find('leaseend', 'lend', 'end');
  map.bond_amount = find('bondamount', 'bondamt', 'bond');
  map.rent_paid_to_date = find('paidtodate', 'rentpaidto', 'paidto');
  map.management_fee_pct = find('managementfee', 'mgmtfee', 'mgmtpct', 'fee');
  map.bond_lodgement_number = find('bondlodgement', 'bondnumber', 'bondref', 'bondlodge');
  map.bond_authority = find('bondauthority', 'authority', 'bondauth');
  map.letting_fee_weeks = find('lettingfee', 'letfee');
  map.lease_type = find('leasetype', 'leasetyp');
  map.vacating_date = find('vacating', 'vacate');
  map.property_type = find('propertytype', 'type');
  map.beds = find('beds', 'bedrooms', 'bed');
  map.baths = find('baths', 'bathrooms', 'bath');
  map.ledger_balance = find('ledgerbalance', 'balance', 'ledgbal');
  return map;
}

// ── Types ──
interface RentRollMigrationWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface ParsedRow {
  property_address: string;
  owner_name: string;
  tenant_name: string;
  rent_amount: number;
  rent_frequency: 'weekly' | 'fortnightly' | 'monthly';
  lease_start: string | null;
  lease_end: string | null;
  bond_amount: number;
  rent_paid_to_date: string | null;
  management_fee_pct: number;
  bond_lodgement_number: string;
  bond_authority: string;
  letting_fee_weeks: number;
  lease_type: 'fixed' | 'periodic' | 'boarding';
  vacating_date: string | null;
  property_type: string;
  beds: number;
  baths: number;
  ledger_balance: number;
  issues: string[];
}

const STEPS = [
  { label: 'Source', icon: Database },
  { label: 'Cutover', icon: Banknote },
  { label: 'Upload', icon: FileUp },
  { label: 'Mapping', icon: ListChecks },
  { label: 'Review', icon: ShieldCheck },
  { label: 'Import', icon: CheckCircle2 },
];

export default function RentRollMigrationWizard({ onComplete, onCancel }: RentRollMigrationWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // 0
  const [sourceSystem, setSourceSystem] = useState<CsvFormat>('propertyme');

  // 1
  const [cutoverDate, setCutoverDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [trustBalance, setTrustBalance] = useState<string>('');
  const [bsb, setBsb] = useState('');
  const [acctNum, setAcctNum] = useState('');
  const [bankName, setBankName] = useState('');

  // 2
  const [rentRollFile, setRentRollFile] = useState<File | null>(null);
  const [rentRollData, setRentRollData] = useState<{ headers: string[]; rows: Record<string, string>[] }>({ headers: [], rows: [] });
  const [ownersFile, setOwnersFile] = useState<File | null>(null);
  const [ownersData, setOwnersData] = useState<{ headers: string[]; rows: Record<string, string>[] }>({ headers: [], rows: [] });
  const [tenantsFile, setTenantsFile] = useState<File | null>(null);
  const [tenantsData, setTenantsData] = useState<{ headers: string[]; rows: Record<string, string>[] }>({ headers: [], rows: [] });

  // 3
  const [mapping, setMapping] = useState<Record<RentRollField, string>>({} as Record<RentRollField, string>);

  // 4
  const [unallocatedAssignment, setUnallocatedAssignment] = useState<'float' | 'general'>('float');

  // 5
  const [migrating, setMigrating] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importedBatchId, setImportedBatchId] = useState<string | null>(null);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [counts, setCounts] = useState({ owners: 0, tenants: 0, properties: 0, tenancies: 0, ledgers: 0 });

  // Auto-map when rent roll uploaded or source changes
  useEffect(() => {
    if (rentRollData.headers.length > 0) {
      setMapping(autoMapColumns(rentRollData.headers));
    }
  }, [rentRollData.headers, sourceSystem]);

  const progressPct = ((step + 1) / STEPS.length) * 100;
  const trustBalanceNum = num(trustBalance);

  // ── Parsed rows (from rent roll using mapping) ──
  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!rentRollData.rows.length || !mapping.property_address) return [];
    const today = new Date();
    return rentRollData.rows.map(r => {
      const get = (f: RentRollField) => mapping[f] ? r[mapping[f]] || '' : '';
      const rent_paid_to_date = normalizeDate(get('rent_paid_to_date'));
      const rent_amount = num(get('rent_amount'));
      const bond_amount = num(get('bond_amount'));
      const issues: string[] = [];
      if (!rent_paid_to_date) issues.push('Missing paid-to date');
      if (bond_amount > 0 && rent_amount > 0 && bond_amount < rent_amount * 4) issues.push('Bond < 4 weeks');
      const lt = (get('lease_type') || 'fixed').toLowerCase();
      const lease_type: ParsedRow['lease_type'] = lt.startsWith('per') ? 'periodic' : lt.startsWith('board') ? 'boarding' : 'fixed';
      void today;
      return {
        property_address: get('property_address'),
        owner_name: get('owner_name'),
        tenant_name: get('tenant_name'),
        rent_amount,
        rent_frequency: normalizeFreq(get('rent_frequency')),
        lease_start: normalizeDate(get('lease_start')),
        lease_end: normalizeDate(get('lease_end')),
        bond_amount,
        rent_paid_to_date,
        management_fee_pct: num(get('management_fee_pct')),
        bond_lodgement_number: get('bond_lodgement_number'),
        bond_authority: get('bond_authority'),
        letting_fee_weeks: num(get('letting_fee_weeks')) || 1,
        lease_type,
        vacating_date: normalizeDate(get('vacating_date')),
        property_type: get('property_type') || 'house',
        beds: parseInt(get('beds')) || 0,
        baths: parseInt(get('baths')) || 0,
        ledger_balance: num(get('ledger_balance')),
        issues,
      };
    });
  }, [rentRollData.rows, mapping]);

  // Owners/tenants lookups by name (lower-cased)
  const ownerLookup = useMemo(() => {
    const m = new Map<string, Record<string, string>>();
    ownersData.rows.forEach(r => {
      const nameKey = Object.keys(r).find(k => /name|owner|landlord/i.test(k));
      if (nameKey && r[nameKey]) m.set(r[nameKey].toLowerCase().trim(), r);
    });
    return m;
  }, [ownersData.rows]);

  const tenantLookup = useMemo(() => {
    const m = new Map<string, Record<string, string>>();
    tenantsData.rows.forEach(r => {
      const nameKey = Object.keys(r).find(k => /name|tenant/i.test(k));
      if (nameKey && r[nameKey]) m.set(r[nameKey].toLowerCase().trim(), r);
    });
    return m;
  }, [tenantsData.rows]);

  // Issues per row including owner BSB checks
  const enrichedRows = useMemo(() => {
    return parsedRows.map(p => {
      const ownerRec = ownerLookup.get(p.owner_name.toLowerCase().trim());
      const ownerBsbRaw = ownerRec ? Object.entries(ownerRec).find(([k]) => /bsb/i.test(k))?.[1] : '';
      const ownerAcctRaw = ownerRec ? Object.entries(ownerRec).find(([k]) => /account.?n|acctn|account.?num/i.test(k))?.[1] : '';
      const ownerBsb = (ownerBsbRaw || '').replace(/\D/g, '');
      const issues = [...p.issues];
      if (!ownerBsb || ownerBsb.length !== 6) issues.push('Owner BSB missing/invalid');
      if (!ownerAcctRaw) issues.push('Owner account number missing');
      const tenantRec = tenantLookup.get(p.tenant_name.toLowerCase().trim());
      const tenantEmail = tenantRec ? Object.entries(tenantRec).find(([k]) => /email/i.test(k))?.[1] : '';
      if (!tenantEmail) issues.push('Tenant email missing');
      return { ...p, issues };
    });
  }, [parsedRows, ownerLookup, tenantLookup]);

  const ledgerTotal = useMemo(() => enrichedRows.reduce((s, r) => s + r.ledger_balance, 0), [enrichedRows]);
  const balanceDifference = trustBalanceNum - ledgerTotal;

  // P0 errors check
  const missingBsbCount = enrichedRows.filter(r => r.issues.some(i => i.includes('BSB') || i.includes('account number'))).length;
  const missingBsbPct = enrichedRows.length ? (missingBsbCount / enrichedRows.length) * 100 : 0;
  const hasP0 = missingBsbPct > 20 || Math.abs(balanceDifference) > 100;

  // ── Validation per step ──
  const canProceed = (): boolean => {
    if (step === 0) return !!sourceSystem;
    if (step === 1) return !!cutoverDate && trustBalanceNum > 0;
    if (step === 2) return !!rentRollFile && !!ownersFile && !!tenantsFile;
    if (step === 3) {
      const requiredOk = RENT_ROLL_FIELDS.filter(f => f.required).every(f => !!mapping[f.id]);
      return requiredOk;
    }
    if (step === 4) return !hasP0;
    return true;
  };

  // ── File upload handlers ──
  const handleFile = (file: File, setter: (f: File) => void, dataSetter: (d: { headers: string[]; rows: Record<string, string>[] }) => void, label: string) => {
    setter(file);
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = parseCsv((e.target?.result as string) || '');
      if (parsed.headers.length === 0) { toast.error(`${label}: empty CSV`); return; }
      dataSetter(parsed);
      toast.success(`${label}: ${parsed.rows.length} rows parsed`);
    };
    reader.readAsText(file);
  };

  // ── Sample template download ──
  const downloadSample = (which: 'rentRoll' | 'owners' | 'tenants') => {
    const headers = SAMPLE_HEADERS[sourceSystem][which];
    const sampleRow = headers.map(h => {
      const lh = h.toLowerCase();
      if (lh.includes('address')) return '"123 Beach Rd, Bondi NSW 2026"';
      if (lh.includes('owner') || lh.includes('landlord') && lh.includes('name')) return '"John Smith"';
      if (lh.includes('tenant') && lh.includes('name')) return '"Jane Doe"';
      if (lh.includes('email')) return '"sample@example.com"';
      if (lh.includes('phone')) return '"0400000000"';
      if (lh.includes('bsb')) return '"062-000"';
      if (lh.includes('account') && (lh.includes('num') || lh.includes('no'))) return '"12345678"';
      if (lh.includes('account') && lh.includes('name')) return '"Smith J"';
      if (lh.includes('rent') && !lh.includes('paid') && !lh.includes('freq')) return '"650"';
      if (lh.includes('freq') || lh.includes('period')) return '"weekly"';
      if (lh.includes('start')) return '"2025-06-01"';
      if (lh.includes('end')) return '"2026-05-31"';
      if (lh.includes('paid')) return '"2026-04-28"';
      if (lh.includes('bond') && (lh.includes('amount') || lh === 'bond' || lh.includes('amt'))) return '"2600"';
      if (lh.includes('mgmt') || lh.includes('management') || lh.includes('fee%') || lh.includes('fee ')) return '"7.5"';
      if (lh.includes('bed')) return '"2"';
      if (lh.includes('bath')) return '"1"';
      if (lh.includes('balance')) return '"1200"';
      if (lh.includes('type')) return '"house"';
      return '""';
    }).join(',');
    const csv = `${headers.join(',')}\n${sampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sourceSystem}_${which}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // ── Migration certificate ──
  const generateCertificate = useCallback(() => {
    const today = DATE_AU.format(new Date());
    const sourceLabel = SOURCE_SYSTEMS.find(s => s.id === sourceSystem)?.label || sourceSystem;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Migration Certificate</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; }
  .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 18pt; letter-spacing: 1px; text-transform: uppercase; }
  .header h2 { font-size: 12pt; color: #555; font-weight: normal; margin-top: 4px; }
  .section { margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 10pt; }
  th { background: #f5f5f5; font-weight: 600; }
  .amount { font-family: 'Courier New', monospace; font-weight: 700; }
  .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
  .stamp { display: inline-block; border: 2px solid #2e7d32; color: #2e7d32; padding: 8px 18px; border-radius: 4px; font-weight: 700; margin: 16px 0; }
</style></head><body>
<div class="header">
  <h1>Rent Roll Migration Certificate</h1>
  <h2>ListHQ Migration Wizard v1.0</h2>
</div>
<div class="section"><div class="stamp">✓ MIGRATION COMPLETED</div></div>
<div class="section">
  <table>
    <tr><th width="35%">Date of Migration</th><td>${today}</td></tr>
    <tr><th>Source System</th><td>${sourceLabel}</td></tr>
    <tr><th>Cutover Date</th><td>${DATE_AU.format(new Date(cutoverDate))}</td></tr>
    <tr><th>Owner Contacts</th><td>${counts.owners}</td></tr>
    <tr><th>Tenant Contacts</th><td>${counts.tenants}</td></tr>
    <tr><th>Properties Imported</th><td>${counts.properties}</td></tr>
    <tr><th>Active Tenancies</th><td>${counts.tenancies}</td></tr>
    <tr><th>Trust Ledger Accounts</th><td>${counts.ledgers}</td></tr>
    <tr><th>Opening Trust Balance</th><td class="amount">${AUD.format(trustBalanceNum)}</td></tr>
    <tr><th>Ledger Total</th><td class="amount">${AUD.format(ledgerTotal)}</td></tr>
    ${importedBatchId ? `<tr><th>Batch ID</th><td style="font-family:monospace;font-size:9pt">${importedBatchId}</td></tr>` : ''}
  </table>
</div>
<div class="footer">Generated ${today} • Imported by ListHQ Migration Wizard v1.0 • Retain for audit (7 years)</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }, [sourceSystem, cutoverDate, counts, trustBalanceNum, ledgerTotal, importedBatchId]);

  // ── Import handler ──
  const handleImport = async () => {
    if (!user) { toast.error('Not signed in'); return; }
    setMigrating(true);
    setImportProgress(0);
    setImportStatus('Looking up agent profile…');
    try {
      const { data: agent, error: agentErr } = await supabase
        .from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (agentErr) throw agentErr;
      if (!agent) throw new Error('Agent profile not found');

      // 1. Migration batch
      setImportStatus('Creating migration batch…');
      setImportProgress(5);
      const { data: batch, error: batchErr } = await supabase
        .from('migration_batches' as any)
        .insert({
          agent_id: agent.id,
          source_system: sourceSystem,
          cutover_date: cutoverDate,
          trust_opening_balance: trustBalanceNum,
          status: 'in_progress',
          notes: bankName ? `Bank: ${bankName} BSB:${bsb} Acct:${acctNum}` : null,
        } as any)
        .select('id')
        .maybeSingle();
      if (batchErr) throw batchErr;
      const batchId = (batch as any)?.id;
      if (!batchId) throw new Error('Failed to create migration batch');
      setImportedBatchId(batchId);

      // 2. Owner contacts (one per unique owner from rent roll)
      setImportStatus('Creating owner contacts…');
      setImportProgress(15);
      const uniqueOwners = Array.from(new Set(enrichedRows.map(r => r.owner_name).filter(Boolean)));
      const ownerInserts = uniqueOwners.map(name => {
        const rec = ownerLookup.get(name.toLowerCase().trim()) || {};
        const get = (re: RegExp) => Object.entries(rec).find(([k]) => re.test(k))?.[1] || '';
        const fullName = name.trim();
        const parts = fullName.split(/\s+/);
        return {
          created_by: user.id,
          contact_type: 'landlord',
          first_name: parts[0] || fullName,
          last_name: parts.slice(1).join(' ') || null,
          email: get(/email/i) || null,
          phone: get(/^phone|^mobile/i) || null,
          owner_bsb: (get(/bsb/i) || '').replace(/\D/g, '') || null,
          owner_account_number: get(/account.?n|acctn/i) || null,
          owner_account_name: get(/account.?name|acctname/i) || fullName,
          abn: get(/abn/i) || null,
          gst_registered: /^(y|true|1)/i.test(get(/gst/i) || ''),
          address: get(/address/i) || null,
          migration_batch_id: batchId,
        };
      });
      const ownerIdByName = new Map<string, string>();
      if (ownerInserts.length > 0) {
        const { data: ownersOut, error: ownerErr } = await supabase
          .from('contacts').insert(ownerInserts as any).select('id, first_name, last_name');
        if (ownerErr) throw ownerErr;
        (ownersOut || []).forEach((o: any) => {
          const fn = `${o.first_name || ''} ${o.last_name || ''}`.trim().toLowerCase();
          ownerIdByName.set(fn, o.id);
        });
      }

      // 3. Tenant contacts
      setImportStatus('Creating tenant contacts…');
      setImportProgress(35);
      const uniqueTenants = Array.from(new Set(enrichedRows.map(r => r.tenant_name).filter(Boolean)));
      const tenantInserts = uniqueTenants.map(name => {
        const rec = tenantLookup.get(name.toLowerCase().trim()) || {};
        const get = (re: RegExp) => Object.entries(rec).find(([k]) => re.test(k))?.[1] || '';
        const parts = name.trim().split(/\s+/);
        return {
          created_by: user.id,
          contact_type: 'tenant',
          first_name: parts[0] || name,
          last_name: parts.slice(1).join(' ') || null,
          email: get(/email/i) || null,
          phone: get(/^phone|^mobile/i) || null,
          emergency_contact_name: get(/emergency.?name|nok.?name|emg.?name/i) || null,
          emergency_contact_phone: get(/emergency.?phone|nok.?phone|emg.?phone/i) || null,
          emergency_contact_relationship: get(/emergency.?rel|nok.?rel|emg.?rel/i) || null,
          date_of_birth: normalizeDate(get(/dob|birth/i) || '') || null,
          employer_name: get(/employer.?name|^employer$/i) || null,
          employer_phone: get(/employer.?phone|emp.?phone/i) || null,
          migration_batch_id: batchId,
        };
      });
      const tenantIdByName = new Map<string, string>();
      if (tenantInserts.length > 0) {
        const { data: tenantsOut, error: tErr } = await supabase
          .from('contacts').insert(tenantInserts as any).select('id, first_name, last_name');
        if (tErr) throw tErr;
        (tenantsOut || []).forEach((t: any) => {
          const fn = `${t.first_name || ''} ${t.last_name || ''}`.trim().toLowerCase();
          tenantIdByName.set(fn, t.id);
        });
      }

      // 4. Properties
      setImportStatus('Creating properties…');
      setImportProgress(55);
      const propertyInserts = enrichedRows.map(r => {
        const { suburb, state, postcode } = parseAddress(r.property_address);
        const ownerId = ownerIdByName.get(r.owner_name.toLowerCase().trim()) || null;
        const weeklyRent = r.rent_frequency === 'weekly' ? r.rent_amount
          : r.rent_frequency === 'fortnightly' ? r.rent_amount / 2
          : (r.rent_amount * 12) / 52;
        return {
          agent_id: agent.id,
          title: r.property_address.split(',')[0] || r.property_address,
          address: r.property_address,
          suburb: suburb || 'Unknown',
          state: state || 'NSW',
          postcode: postcode || null,
          country: 'Australia',
          price: Math.round(weeklyRent),
          price_formatted: `$${Math.round(weeklyRent)}/week`,
          beds: r.beds,
          baths: r.baths,
          parking: 0,
          sqm: 0,
          property_type: r.property_type || 'house',
          listing_type: 'rental',
          listing_mode: 'standard',
          listing_category: 'residential',
          status: 'active',
          is_active: true,
          pm_management_fee_percent: r.management_fee_pct,
          pm_letting_fee_weeks: r.letting_fee_weeks,
          pm_status: r.tenant_name ? 'active' : 'vacant',
          pm_owner_contact_id: ownerId,
          migration_batch_id: batchId,
        };
      });
      const { data: propertiesOut, error: propErr } = await supabase
        .from('properties').insert(propertyInserts as any).select('id, address');
      if (propErr) throw propErr;
      const propertyIdByAddress = new Map<string, string>();
      (propertiesOut || []).forEach((p: any) => propertyIdByAddress.set((p.address || '').toLowerCase().trim(), p.id));

      // 5. Tenancies
      setImportStatus('Creating tenancies…');
      setImportProgress(75);
      const today = new Date();
      const tenancyInserts = enrichedRows
        .filter(r => r.tenant_name && r.lease_start && r.lease_end)
        .map(r => {
          const propId = propertyIdByAddress.get(r.property_address.toLowerCase().trim());
          const tenantId = tenantIdByName.get(r.tenant_name.toLowerCase().trim()) || null;
          const paidTo = r.rent_paid_to_date ? new Date(r.rent_paid_to_date) : null;
          let arrearsWeeks = 0;
          if (paidTo) {
            const daysBehind = Math.max(0, Math.floor((today.getTime() - paidTo.getTime()) / 86400000));
            arrearsWeeks = +(daysBehind / 7).toFixed(2);
          }
          return propId ? {
            property_id: propId,
            agent_id: agent.id,
            tenant_name: r.tenant_name,
            tenant_contact_id: tenantId,
            lease_start: r.lease_start,
            lease_end: r.lease_end,
            rent_amount: r.rent_amount,
            rent_frequency: r.rent_frequency,
            bond_amount: r.bond_amount,
            management_fee_percent: r.management_fee_pct,
            status: 'active',
            rent_paid_to_date: r.rent_paid_to_date,
            arrears_weeks: arrearsWeeks,
            lease_type: r.lease_type,
            vacating_date: r.vacating_date,
            letting_fee_weeks: r.letting_fee_weeks,
            migration_batch_id: batchId,
          } : null;
        })
        .filter(Boolean);
      const tenancyIdByPropertyId = new Map<string, string>();
      if (tenancyInserts.length > 0) {
        const { data: tenanciesOut, error: tErr } = await supabase
          .from('tenancies').insert(tenancyInserts as any).select('id, property_id');
        if (tErr) throw tErr;
        (tenanciesOut || []).forEach((t: any) => tenancyIdByPropertyId.set(t.property_id, t.id));
      }

      // 6. Trust ledger accounts (one per property)
      setImportStatus('Setting up trust ledger accounts…');
      setImportProgress(88);
      const propCount = enrichedRows.length || 1;
      const evenSplit = trustBalanceNum / propCount;
      const ledgerInserts = enrichedRows.map(r => {
        const propId = propertyIdByAddress.get(r.property_address.toLowerCase().trim());
        if (!propId) return null;
        const tenancyId = tenancyIdByPropertyId.get(propId) || null;
        const opening = r.ledger_balance > 0 ? r.ledger_balance : evenSplit;
        return {
          agent_id: agent.id,
          property_id: propId,
          tenancy_id: tenancyId,
          migration_batch_id: batchId,
          ledger_name: `${r.property_address}${r.tenant_name ? ' — ' + r.tenant_name : ''}`,
          ledger_type: 'rental',
          opening_balance: opening,
          current_balance: opening,
          cutover_date: cutoverDate,
        };
      }).filter(Boolean);

      // Add float/general ledger if there's a balance difference
      if (Math.abs(balanceDifference) >= 0.01) {
        ledgerInserts.push({
          agent_id: agent.id,
          property_id: null,
          tenancy_id: null,
          migration_batch_id: batchId,
          ledger_name: unallocatedAssignment === 'float' ? 'Float (unallocated)' : 'General (unallocated)',
          ledger_type: unallocatedAssignment === 'float' ? 'float' : 'general',
          opening_balance: balanceDifference,
          current_balance: balanceDifference,
          cutover_date: cutoverDate,
        } as any);
      }

      if (ledgerInserts.length > 0) {
        const { error: lErr } = await supabase.from('trust_ledger_accounts' as any).insert(ledgerInserts as any);
        if (lErr) throw lErr;
      }

      // 7. Mark batch complete
      setImportStatus('Finalising…');
      setImportProgress(96);
      const finalCounts = {
        owners: ownerInserts.length,
        tenants: tenantInserts.length,
        properties: propertyInserts.length,
        tenancies: tenancyInserts.length,
        ledgers: ledgerInserts.length,
      };
      setCounts(finalCounts);
      await supabase.from('migration_batches' as any).update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        property_count: finalCounts.properties,
        tenancy_count: finalCounts.tenancies,
        owner_count: finalCounts.owners,
        tenant_count: finalCounts.tenants,
        ledger_account_count: finalCounts.ledgers,
      } as any).eq('id', batchId);

      setImportStatus('Done!');
      setImportProgress(100);
      setMigrationComplete(true);
      toast.success('Migration complete');
    } catch (err) {
      console.error(err);
      toast.error(`Import failed: ${getErrorMessage(err)}`);
      setImportStatus(`Failed: ${getErrorMessage(err)}`);
    } finally {
      setMigrating(false);
    }
  };

  // ── Completion screen ──
  if (migrationComplete) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Rent roll imported successfully</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {counts.properties} properties, {counts.tenancies} tenancies, {counts.owners + counts.tenants} contacts
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto text-left">
              <Stat label="Properties" value={counts.properties} />
              <Stat label="Tenancies" value={counts.tenancies} />
              <Stat label="Owners" value={counts.owners} />
              <Stat label="Tenants" value={counts.tenants} />
              <Stat label="Ledgers" value={counts.ledgers} />
              <Stat label="Trust opening" value={AUD.format(trustBalanceNum)} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="outline" onClick={generateCertificate} className="gap-2">
                <Printer size={14} /> Download Migration Certificate
              </Button>
              <Button onClick={onComplete} className="gap-2">
                Go to Dashboard <ArrowRight size={14} />
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground pt-2">
              You can rollback this import within 48 hours from Trust Accounting → Settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Database size={20} className="text-primary" />
            Rent Roll Migration
          </h2>
          <Badge variant="outline" className="text-xs">Step {step + 1} of {STEPS.length}</Badge>
        </div>
        <Progress value={progressPct} className="h-1.5" />
        <div className="flex justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={i} className={`flex items-center gap-1.5 text-xs font-medium ${
                isDone ? 'text-primary' : isActive ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 size={14} className="text-primary" /> : <Icon size={14} />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* STEP 0 — Source */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-4">
                <Database size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Where are you migrating from?</h3>
                <p className="text-xs text-muted-foreground">Pick your current property management system</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SOURCE_SYSTEMS.map(s => {
                  const selected = sourceSystem === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSourceSystem(s.id)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Database size={14} className={selected ? 'text-primary' : 'text-muted-foreground'} />
                        <span className="text-sm font-semibold">{s.label}</span>
                        {selected && <CheckCircle2 size={14} className="text-primary ml-auto" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{s.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 1 — Cutover */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-4">
                <Banknote size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Cutover date & trust balance</h3>
                <p className="text-xs text-muted-foreground">The day your books move from your old system to ListHQ</p>
              </div>

              <div>
                <Label className="text-xs font-medium">Cutover date *</Label>
                <Input type="date" value={cutoverDate} onChange={e => setCutoverDate(e.target.value)} className="mt-1.5 h-10" />
              </div>

              <div>
                <Label className="text-xs font-medium">Trust account bank balance on cutover date *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                  <Input type="number" step="0.01" value={trustBalance} onChange={e => setTrustBalance(e.target.value)} placeholder="142,560.00" className="pl-7 text-lg font-semibold h-12" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">BSB</Label>
                  <Input value={bsb} onChange={e => setBsb(e.target.value)} placeholder="062-000" className="mt-1.5 h-10 font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Account number</Label>
                  <Input value={acctNum} onChange={e => setAcctNum(e.target.value)} placeholder="12345678" className="mt-1.5 h-10 font-mono" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Bank name</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Commonwealth Bank" className="mt-1.5 h-10" />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border flex gap-2">
                <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Your trust account bank balance on the cutover date must match the total of all your property ledger balances. We'll validate this in Step 5.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2 — Upload */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-4">
                <FileUp size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Upload your CSV exports</h3>
                <p className="text-xs text-muted-foreground">All three files are required</p>
              </div>

              <UploadCard
                title="Rent Roll Export"
                description="Properties, tenancies, rent amounts, bond details, management fees"
                helper={HELPER_RENT_ROLL[sourceSystem]}
                file={rentRollFile}
                rows={rentRollData.rows}
                headers={rentRollData.headers}
                inputId="rent-roll-input"
                icon={Building2}
                onFile={f => handleFile(f, setRentRollFile, setRentRollData, 'Rent roll')}
                onTemplate={() => downloadSample('rentRoll')}
              />
              <UploadCard
                title="Owner / Landlord Contacts"
                description="Names, emails, bank accounts (BSB + account number for disbursements)"
                helper={HELPER_OWNERS[sourceSystem]}
                file={ownersFile}
                rows={ownersData.rows}
                headers={ownersData.headers}
                inputId="owners-input"
                icon={Users}
                onFile={f => handleFile(f, setOwnersFile, setOwnersData, 'Owners')}
                onTemplate={() => downloadSample('owners')}
              />
              <UploadCard
                title="Tenant Contacts"
                description="Names, emails, phone numbers, emergency contacts"
                helper={HELPER_TENANTS[sourceSystem]}
                file={tenantsFile}
                rows={tenantsData.rows}
                headers={tenantsData.headers}
                inputId="tenants-input"
                icon={Users}
                onFile={f => handleFile(f, setTenantsFile, setTenantsData, 'Tenants')}
                onTemplate={() => downloadSample('tenants')}
              />
            </div>
          )}

          {/* STEP 3 — Mapping */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-4">
                <ListChecks size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Map your CSV columns</h3>
                <p className="text-xs text-muted-foreground">Auto-detected from your {SOURCE_SYSTEMS.find(s => s.id === sourceSystem)?.label} export</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">ListHQ Field</TableHead>
                      <TableHead className="text-[10px]">Your CSV Column</TableHead>
                      <TableHead className="text-[10px] w-16 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RENT_ROLL_FIELDS.map(f => {
                      const value = mapping[f.id] || '';
                      const ok = !!value;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="text-xs">
                            {f.label} {f.required && <span className="text-destructive">*</span>}
                          </TableCell>
                          <TableCell>
                            <Select value={value || '__none__'} onValueChange={v => setMapping(m => ({ ...m, [f.id]: v === '__none__' ? '' : v }))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— not mapped —" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— not mapped —</SelectItem>
                                {rentRollData.headers.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            {ok ? <CheckCircle2 size={14} className="text-primary inline" />
                             : f.required ? <AlertTriangle size={14} className="text-amber-500 inline" />
                             : <span className="text-muted-foreground text-[10px]">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-4">
                <ShieldCheck size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Validation & review</h3>
                <p className="text-xs text-muted-foreground">{enrichedRows.length} properties parsed</p>
              </div>

              {/* Section A: Property Summary */}
              <div>
                <p className="text-xs font-semibold mb-2">Property summary</p>
                <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Address</TableHead>
                        <TableHead className="text-[10px]">Tenant</TableHead>
                        <TableHead className="text-[10px]">Owner</TableHead>
                        <TableHead className="text-[10px] text-right">Rent</TableHead>
                        <TableHead className="text-[10px]">Paid To</TableHead>
                        <TableHead className="text-[10px] text-right">Bond</TableHead>
                        <TableHead className="text-[10px] text-right">Ledger</TableHead>
                        <TableHead className="text-[10px]">Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrichedRows.slice(0, 50).map((r, i) => {
                        const arrearsAge = r.rent_paid_to_date ? Math.floor((Date.now() - new Date(r.rent_paid_to_date).getTime()) / 86400000) : 0;
                        const inArrears = arrearsAge > 7;
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-[10px] max-w-[140px] truncate">{r.property_address}</TableCell>
                            <TableCell className="text-[10px]">{r.tenant_name || '—'}</TableCell>
                            <TableCell className="text-[10px]">{r.owner_name || '—'}</TableCell>
                            <TableCell className="text-[10px] text-right">{r.rent_amount ? AUD.format(r.rent_amount) : '—'}</TableCell>
                            <TableCell className={`text-[10px] ${inArrears ? 'text-destructive font-semibold' : ''}`}>{r.rent_paid_to_date || '—'}</TableCell>
                            <TableCell className="text-[10px] text-right">{r.bond_amount ? AUD.format(r.bond_amount) : '—'}</TableCell>
                            <TableCell className="text-[10px] text-right">{r.ledger_balance ? AUD.format(r.ledger_balance) : '—'}</TableCell>
                            <TableCell>
                              {r.issues.length === 0
                                ? <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-200">OK</Badge>
                                : <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700 border-amber-200">{r.issues.length}</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {enrichedRows.length > 50 && <p className="text-[10px] text-muted-foreground text-center mt-2">…and {enrichedRows.length - 50} more</p>}
              </div>

              {/* Section B: Reconciliation */}
              <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                <p className="text-xs font-semibold">Balance reconciliation</p>
                <div className="flex justify-between text-xs"><span>Trust account bank balance</span><span className="font-mono font-semibold">{AUD.format(trustBalanceNum)}</span></div>
                <div className="flex justify-between text-xs"><span>Total of property ledger balances</span><span className="font-mono font-semibold">{AUD.format(ledgerTotal)}</span></div>
                <div className={`flex justify-between text-xs pt-2 border-t ${Math.abs(balanceDifference) > 0.01 ? 'text-amber-700' : 'text-primary'}`}>
                  <span className="font-semibold">Unallocated difference</span>
                  <span className="font-mono font-bold">{AUD.format(balanceDifference)}</span>
                </div>

                {Math.abs(balanceDifference) > 0.01 && (
                  <div className="pt-3 space-y-2">
                    <div className="flex items-start gap-2 bg-amber-500/10 rounded-lg p-3 border border-amber-200">
                      <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-900">
                        Your ledger balances don't match your bank balance. You have an unallocated amount of {AUD.format(balanceDifference)}. Where should this be assigned?
                      </p>
                    </div>
                    <Select value={unallocatedAssignment} onValueChange={(v: 'float' | 'general') => setUnallocatedAssignment(v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="float">Float ledger</SelectItem>
                        <SelectItem value="general">General ledger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {hasP0 && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <div className="text-xs text-destructive">
                    <p className="font-semibold">Cannot proceed:</p>
                    {missingBsbPct > 20 && <p>• More than 20% of properties are missing BSB or account numbers ({missingBsbPct.toFixed(0)}%)</p>}
                    {Math.abs(balanceDifference) > 100 && <p>• Balance difference exceeds $100 ({AUD.format(balanceDifference)})</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 — Confirm & Import */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-4">
                <CheckCircle2 size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Confirm & import</h3>
                <p className="text-xs text-muted-foreground">Review before going live</p>
              </div>

              <div className="rounded-lg border p-4 space-y-2 bg-primary/5">
                <SummaryRow label="Properties to import" value={enrichedRows.length} />
                <SummaryRow label="Active tenancies" value={enrichedRows.filter(r => r.tenant_name).length} />
                <SummaryRow label="Owner contacts" value={new Set(enrichedRows.map(r => r.owner_name)).size} />
                <SummaryRow label="Tenant contacts" value={new Set(enrichedRows.map(r => r.tenant_name).filter(Boolean)).size} />
                <SummaryRow label="Opening trust balance" value={AUD.format(trustBalanceNum)} />
                <SummaryRow label="Cutover date" value={DATE_AU.format(new Date(cutoverDate))} />
                <SummaryRow label="Source system" value={SOURCE_SYSTEMS.find(s => s.id === sourceSystem)?.label || sourceSystem} />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border flex gap-2">
                <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  You can rollback this import within 48 hours from your Trust Accounting settings if anything needs correcting.
                </p>
              </div>

              {migrating && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">{importStatus}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)} disabled={migrating} className="gap-1.5">
          <ArrowLeft size={14} /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="gap-1.5">
            Continue <ArrowRight size={14} />
          </Button>
        ) : (
          <Button onClick={handleImport} disabled={migrating} className="gap-1.5 px-6">
            {migrating ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><CheckCircle2 size={14} /> Start Import</>}
          </Button>
        )}
      </div>

      <div className="py-2 px-4 rounded-lg bg-muted/50 border border-border flex items-center justify-center gap-2">
        <ShieldCheck size={12} className="text-primary shrink-0" />
        <p className="text-[10px] text-muted-foreground text-center">
          Reversible within 48h • Full audit trail • 7-year retention
        </p>
      </div>
    </div>
  );
}

// ── Helpers ──
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/30">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-primary" /> {label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

interface UploadCardProps {
  title: string;
  description: string;
  helper: string;
  file: File | null;
  rows: Record<string, string>[];
  headers: string[];
  inputId: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onFile: (f: File) => void;
  onTemplate: () => void;
}

function UploadCard({ title, description, helper, file, rows, headers, inputId, icon: Icon, onFile, onTemplate }: UploadCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 shrink-0"><Icon size={16} className="text-primary" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            {file && <CheckCircle2 size={14} className="text-primary" />}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          <p className="text-[10px] text-muted-foreground mt-1 italic">Where to find: {helper}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onTemplate} className="gap-1.5 h-7 text-[10px] shrink-0">
          <Download size={10} /> Template
        </Button>
      </div>
      <div
        className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => document.getElementById(inputId)?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
        onDragLeave={e => e.currentTarget.classList.remove('border-primary')}
        onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-primary'); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      >
        <input id={inputId} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
        {file ? (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <FileText size={14} className="text-primary" />
            <span className="text-xs font-medium">{file.name}</span>
            <Badge className="text-[10px]">{rows.length} rows</Badge>
          </div>
        ) : (
          <>
            <Upload size={18} className="mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Drop CSV or click to upload</p>
          </>
        )}
      </div>
      {rows.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.slice(0, 6).map(h => <TableHead key={h} className="text-[10px]">{h}</TableHead>)}
                {headers.length > 6 && <TableHead className="text-[10px]">+{headers.length - 6}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 3).map((r, i) => (
                <TableRow key={i}>
                  {headers.slice(0, 6).map(h => <TableCell key={h} className="text-[10px] max-w-[100px] truncate">{r[h]}</TableCell>)}
                  {headers.length > 6 && <TableCell className="text-[10px] text-muted-foreground">…</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
