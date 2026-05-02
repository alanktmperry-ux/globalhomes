export interface StateComplianceConfig {
  state: string;
  legislation: string;
  retentionYears: number;
  bondAuthority: string;
  bondLodgementDays: string;
  bondLodgementUrl: string;
  bondNote?: string;
  reconciliationFrequency: string;
  auditRequirement: string;
}

export const TRUST_COMPLIANCE_CONFIG: Record<string, StateComplianceConfig> = {
  QLD: {
    state: 'Queensland',
    legislation: 'Agents Financial Administration Act 2014 (AFA 2014)',
    retentionYears: 5,
    bondAuthority: 'Residential Tenancies Authority (RTA)',
    bondLodgementDays: '10 days of receipt',
    bondLodgementUrl: 'https://www.rta.qld.gov.au',
    reconciliationFrequency: 'Monthly',
    auditRequirement: 'Annual audit by a registered company auditor',
  },
  NSW: {
    state: 'New South Wales',
    legislation: 'Property and Stock Agents Act 2002 + Regulation 2022',
    retentionYears: 7,
    bondAuthority: 'NSW Fair Trading — Rental Bonds Online',
    bondLodgementDays: '7 days of receipt',
    bondLodgementUrl: 'https://www.fairtrading.nsw.gov.au/housing-and-property/renting/rental-bonds',
    reconciliationFrequency: 'Monthly',
    auditRequirement: 'Annual audit by a registered company auditor',
  },
  VIC: {
    state: 'Victoria',
    legislation: 'Estate Agents Act 1980 + Estate Agents (General, Accounts and Audit) Regulations 2018',
    retentionYears: 7,
    bondAuthority: 'Residential Tenancies Bond Authority (RTBA)',
    bondLodgementDays: '10 business days of receipt',
    bondLodgementUrl: 'https://www.rtba.vic.gov.au',
    bondNote: 'In Victoria, rental bonds must be lodged directly with the RTBA — bonds do not pass through your trust account.',
    reconciliationFrequency: 'Monthly',
    auditRequirement: 'Annual audit by an ASIC-registered company auditor',
  },
  WA: {
    state: 'Western Australia',
    legislation: 'Real Estate and Business Agents Act 1978',
    retentionYears: 6,
    bondAuthority: 'Bond Administrator — Dept of Mines, Industry, Regulation and Safety',
    bondLodgementDays: '14 days of receipt',
    bondLodgementUrl: 'https://www.commerce.wa.gov.au/consumer-protection/rental-bonds',
    reconciliationFrequency: 'Monthly',
    auditRequirement: 'Annual audit by a registered company auditor',
  },
  SA: {
    state: 'South Australia',
    legislation: 'Land Agents Act 1994 + Land Agents Regulations 2010',
    retentionYears: 5,
    bondAuthority: 'Consumer and Business Services (CBS)',
    bondLodgementDays: '14 days of receipt',
    bondLodgementUrl: 'https://www.cbs.sa.gov.au',
    reconciliationFrequency: 'Monthly',
    auditRequirement: 'Annual audit by a registered company auditor',
  },
  TAS: {
    state: 'Tasmania',
    legislation: 'Property Agents Act 2016',
    retentionYears: 5,
    bondAuthority: 'Consumer, Building and Occupational Services (CBOS)',
    bondLodgementDays: '30 days of receipt',
    bondLodgementUrl: 'https://www.cbos.tas.gov.au',
    reconciliationFrequency: 'Monthly',
    auditRequirement: 'Annual audit by a registered company auditor',
  },
  NT: {
    state: 'Northern Territory',
    legislation: 'Agents Licensing Act 2010',
    retentionYears: 5,
    bondAuthority: 'NT Consumer Affairs',
    bondLodgementDays: '3 business days of receipt',
    bondLodgementUrl: 'https://nt.gov.au/property/renters',
    reconciliationFrequency: 'Monthly',
    auditRequirement: 'Annual audit by a registered company auditor',
  },
  ACT: {
    state: 'Australian Capital Territory',
    legislation: 'Agents Act 2003',
    retentionYears: 5,
    bondAuthority: 'Access Canberra — ACT Revenue Office',
    bondLodgementDays: '14 days of receipt',
    bondLodgementUrl: 'https://www.accesscanberra.act.gov.au',
    reconciliationFrequency: 'Monthly',
    auditRequirement: 'Annual audit by a registered company auditor',
  },
};

export const DEFAULT_COMPLIANCE = TRUST_COMPLIANCE_CONFIG['QLD'];

export function getComplianceConfig(state?: string | null): StateComplianceConfig {
  if (!state) return DEFAULT_COMPLIANCE;
  const key = state.trim().toUpperCase();
  const nameMap: Record<string, string> = {
    'QUEENSLAND': 'QLD',
    'NEW SOUTH WALES': 'NSW',
    'VICTORIA': 'VIC',
    'WESTERN AUSTRALIA': 'WA',
    'SOUTH AUSTRALIA': 'SA',
    'TASMANIA': 'TAS',
    'NORTHERN TERRITORY': 'NT',
    'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
  };
  const resolved = nameMap[key] || key;
  return TRUST_COMPLIANCE_CONFIG[resolved] || DEFAULT_COMPLIANCE;
}
