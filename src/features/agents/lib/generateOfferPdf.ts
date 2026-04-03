import jsPDF from 'jspdf';

interface OfferPdfData {
  propertyAddress: string;
  buyerName: string;
  offerAmount: number;
  settlementDays: number;
  conditions: string;
  draftText: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentAgency?: string;
  agentLicence?: string;
  comparableSales?: { address: string; price: number }[];
  suburbMedian?: number | null;
}

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 0,
});

const BRAND_COLOR: [number, number, number] = [26, 86, 219]; // #1A56DB
const ACCENT_COLOR: [number, number, number] = [231, 70, 148]; // #E74694
const TEXT_COLOR: [number, number, number] = [51, 51, 51];
const MUTED_COLOR: [number, number, number] = [107, 114, 128];
const PAGE_W = 210;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function generateOfferPdf(data: OfferPdfData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Header ──────────────────────────────────────
  doc.setFontSize(22);
  doc.setTextColor(...BRAND_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.text('ListHQ', PAGE_W / 2, y, { align: 'center' });
  y += 7;

  if (data.agentName) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_COLOR);
    doc.setFont('helvetica', 'normal');
    const agentLine = [data.agentName, data.agentAgency, data.agentPhone, data.agentEmail]
      .filter(Boolean)
      .join('  |  ');
    doc.text(agentLine, PAGE_W / 2, y, { align: 'center' });
    y += 5;
  }

  // Divider
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  // ── Title ───────────────────────────────────────
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFER TO PURCHASE', MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.text('Property:', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.propertyAddress, MARGIN + 22, y);
  y += 12;

  // ── Offer Summary ──────────────────────────────
  const drawSectionHeading = (title: string) => {
    ensureSpace(14);
    doc.setDrawColor(...ACCENT_COLOR);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y - 1, MARGIN, y + 5);
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.text(title, MARGIN + 4, y + 4);
    y += 12;
  };

  drawSectionHeading('Offer Summary');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_COLOR);

  const summaryRows = [
    ['Buyer Name', data.buyerName],
    ['Offer Price', AUD.format(data.offerAmount)],
    ['Settlement', `${data.settlementDays} days`],
    ['Date Submitted', new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })],
  ];

  summaryRows.forEach(([label, value]) => {
    ensureSpace(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN + 35, y);
    y += 6;
  });
  y += 4;

  // ── Comparable Sales ────────────────────────────
  if (data.comparableSales && data.comparableSales.length > 0) {
    drawSectionHeading('Comparable Sales Analysis');

    // Table header
    const colX = [MARGIN, MARGIN + 100];
    ensureSpace(10);
    doc.setFillColor(243, 244, 246);
    doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Address', colX[0] + 2, y);
    doc.text('Sale Price', colX[1] + 2, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_COLOR);
    data.comparableSales.forEach((comp) => {
      ensureSpace(8);
      doc.setDrawColor(229, 231, 235);
      doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3);
      const addrLines = doc.splitTextToSize(comp.address, 95);
      doc.text(addrLines, colX[0] + 2, y);
      doc.text(AUD.format(comp.price), colX[1] + 2, y);
      y += addrLines.length * 5 + 2;
    });

    if (data.suburbMedian) {
      y += 4;
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Suburb Median Price: ${AUD.format(data.suburbMedian)}`, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      y += 8;
    }
  }

  // ── Conditions ──────────────────────────────────
  if (data.conditions) {
    drawSectionHeading('Terms & Conditions');
    ensureSpace(14);
    doc.setFillColor(253, 244, 255);
    doc.setDrawColor(...ACCENT_COLOR);
    const condLines = doc.splitTextToSize(data.conditions, CONTENT_W - 10);
    const condHeight = condLines.length * 5 + 6;
    ensureSpace(condHeight + 4);
    doc.rect(MARGIN, y - 4, CONTENT_W, condHeight, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(condLines, MARGIN + 4, y);
    y += condHeight + 4;
  }

  // ── Draft Letter Body ───────────────────────────
  if (data.draftText) {
    drawSectionHeading('Offer Letter');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_COLOR);

    const bodyLines = doc.splitTextToSize(data.draftText, CONTENT_W);
    bodyLines.forEach((line: string) => {
      ensureSpace(6);
      doc.text(line, MARGIN, y);
      y += 4.5;
    });
    y += 6;
  }

  // ── Footer ──────────────────────────────────────
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setPage(pageNum);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 282, PAGE_W - MARGIN, 282);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(
      `Generated by ListHQ on ${new Date().toLocaleDateString('en-AU')}. This document is for informational purposes only and does not constitute legal advice.`,
      MARGIN,
      286,
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, 286, { align: 'right' });
  };

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  // Save
  const safeAddress = data.propertyAddress.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  doc.save(`Offer_${safeAddress}.pdf`);
}
