// Shared brand chrome for ListHQ transactional emails.
// Keep all colors/fonts here so every template stays consistent.

export const BRAND = {
  navy: "#0f172a",
  navySoft: "#1e293b",
  teal: "#3b82f6",
  tealDark: "#2563eb",
  bg: "#f5f5f4",
  card: "#ffffff",
  border: "#e7e5e4",
  text: "#1c1917",
  textMuted: "#78716c",
  textFaint: "#a8a29e",
  font:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};

export function brandHeader(eyebrow?: string): string {
  return `
<div style="background:${BRAND.navy};padding:28px 24px;text-align:center;border-radius:16px 16px 0 0;">
  <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;margin:0;">
    🌐&nbsp; ListHQ
  </div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:6px;letter-spacing:0.5px;text-transform:uppercase;">
    ${eyebrow ?? "Australia's multilingual property platform"}
  </div>
</div>`;
}

export function brandFooter(): string {
  return `
<div style="text-align:center;padding:20px 24px 8px;">
  <div style="font-size:11px;color:${BRAND.textFaint};line-height:1.6;">
    © ListHQ Pty Ltd · Melbourne, Australia<br/>
    Australia's multilingual property platform
  </div>
</div>`;
}

export function brandShell(inner: string, eyebrow?: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:${BRAND.font};color:${BRAND.text};">
    <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
      <div style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
        ${brandHeader(eyebrow)}
        <div style="padding:32px 28px;">
          ${inner}
        </div>
      </div>
      ${brandFooter()}
    </div>
  </body>
</html>`;
}

export function brandButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${href}" style="display:inline-block;background:${BRAND.tealDark};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:10px;">
      ${label}
    </a>
  </div>`;
}

export function brandCodeBlock(code: string): string {
  return `<div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;padding:22px;text-align:center;margin:24px 0;">
    <div style="font-family:'SF Mono',Menlo,Monaco,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND.navy};">
      ${code}
    </div>
  </div>`;
}

export function brandFeature(icon: string, label: string): string {
  return `<tr>
    <td style="padding:10px 0;font-size:14px;color:${BRAND.text};border-top:1px solid ${BRAND.bg};">
      <span style="display:inline-block;width:22px;">${icon}</span> ${label}
    </td>
  </tr>`;
}

export function brandFeatureList(items: Array<{ icon: string; label: string }>): string {
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0 20px;">
    ${items.map((i, idx) =>
      idx === 0
        ? `<tr><td style="padding:10px 0;font-size:14px;color:${BRAND.text};"><span style="display:inline-block;width:22px;">${i.icon}</span> ${i.label}</td></tr>`
        : brandFeature(i.icon, i.label),
    ).join("")}
  </table>`;
}
