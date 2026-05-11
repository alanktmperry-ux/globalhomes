import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Version A+ auth shell — blue gradient background, glass card,
 * white ListHQ logo, multilingual tagline.
 * All children render inside the glass card.
 */
export const AuthShell = ({
  children,
  heading,
  subheading,
  tagline = "Australia's multilingual property platform",
  maxWidth = 'max-w-md',
}: {
  children: ReactNode;
  heading?: ReactNode;
  subheading?: ReactNode;
  tagline?: string;
  maxWidth?: string;
}) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)' }}
    >
      {/* Subtle vertical grid lines */}
      <div className="fixed inset-0 pointer-events-none flex justify-between" style={{ padding: '0 25%' }}>
        <div className="w-px h-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="w-px h-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      <div className={`relative z-10 w-full ${maxWidth}`}>
        <div
          className="w-full rounded-[24px] p-8 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex flex-col items-center mb-8 no-underline">
            <div
              className="w-12 h-12 rounded-[10px] flex items-center justify-center font-bold text-sm mb-3"
              style={{ background: '#FFFFFF', color: '#2563EB' }}
            >
              LHQ
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">ListHQ</span>
          </Link>

          {heading && (
            <h1 className="text-2xl font-bold text-white tracking-tight text-center mb-2">
              {heading}
            </h1>
          )}
          {subheading && (
            <p
              className="text-sm font-light text-center mb-8"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              {subheading}
            </p>
          )}

          {children}
        </div>

        {tagline && (
          <p
            className="text-center text-xs font-light mt-8"
            style={{ color: 'rgba(255,255,255,0.50)' }}
          >
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
};

/* ── Shared styles for inputs/buttons/labels inside AuthShell ── */
export const authStyles = {
  label: 'text-[11px] uppercase font-medium mb-2 block',
  labelStyle: { letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)' } as const,
  input:
    'w-full rounded-[10px] px-4 py-3 text-sm focus:outline-none transition-all placeholder:text-white/35',
  inputStyle: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.20)',
    color: '#FFFFFF',
  } as const,
  field: 'mb-5',
  primaryBtn:
    'w-full bg-white text-[#2563EB] hover:bg-white/95 font-semibold rounded-[10px] py-3 text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50',
  oauthBtn:
    'w-full rounded-[10px] py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:bg-white/15',
  oauthStyle: {
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.20)',
    color: '#FFFFFF',
  } as const,
  link: 'text-white font-semibold hover:underline',
  mutedLink: 'hover:text-white transition-colors',
  mutedLinkStyle: { color: 'rgba(255,255,255,0.80)' } as const,
  footer: 'text-center text-sm font-light mt-6',
  footerStyle: { color: 'rgba(255,255,255,0.70)' } as const,
};

/* ── Reusable alert components ── */
export const AuthError = ({ children }: { children: ReactNode }) => (
  <div
    role="alert"
    className="mb-5 p-3 rounded-[10px] flex items-start gap-2"
    style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.30)' }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="1.5" className="shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <span className="text-sm" style={{ color: '#FECACA' }}>{children}</span>
  </div>
);

export const AuthSuccess = ({ children }: { children: ReactNode }) => (
  <div
    className="mb-5 p-3 rounded-[10px] flex items-start gap-2"
    style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.30)' }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6EE7B7" strokeWidth="1.5" className="shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 12 15 16 10" />
    </svg>
    <span className="text-sm" style={{ color: '#A7F3D0' }}>{children}</span>
  </div>
);

export const AuthDivider = ({ label = 'OR' }: { label?: string }) => (
  <div className="flex items-center my-6">
    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.20)' }} />
    <span className="px-4 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em' }}>
      {label}
    </span>
    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.20)' }} />
  </div>
);

export const AuthSpinner = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
