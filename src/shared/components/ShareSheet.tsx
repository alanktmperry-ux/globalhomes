import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Link2, Share2, MessageCircle, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Property } from '@/shared/lib/types';
import { useI18n } from '@/shared/lib/i18n';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { toast } from 'sonner';
import { capture } from '@/shared/lib/posthog';

interface ShareSheetProps {
  property: Property;
  open: boolean;
  onClose: () => void;
}

export function ShareSheet({ property, open, onClose }: ShareSheetProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const isMobile = useIsMobile();
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  const propertyUrl = `${window.location.origin}/property/${property.id}`;
  const encodedUrl = encodeURIComponent(propertyUrl);
  const qrSize = isMobile ? 160 : 200;

  const shareText = `${property.title} — ${property.address}, ${property.suburb}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${propertyUrl}`)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;

  const saveQR = () => {
    capture('wechat_share_clicked', { listing_id: property.id, action: 'save_qr' });
    const svg = qrWrapperRef.current?.querySelector('svg');
    if (!svg) return;
    const svgXml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(svgXml)));
    const img = new Image();
    img.onload = () => {
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `listhq-property-${property.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${svg64}`;
  };

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(propertyUrl);
      toast.success(t('share.copied'));
    } catch {
      toast.error('Could not copy link');
    }
  };

  const copyForWeChat = async () => {
    try {
      await navigator.clipboard.writeText(propertyUrl);
      capture('wechat_share_clicked', { listing_id: property.id, action: 'copy_link' });
      toast.success(t('share.wechatCopiedToast'));
    } catch {
      toast.error('Could not copy link');
    }
  };

  const nativeShare = async () => {
    capture('native_share_clicked', { listing_id: property.id });
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: shareText,
          url: propertyUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  const thumb = property.images?.[0] || property.imageUrl;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('share.title')}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[85vh] bg-card rounded-t-3xl shadow-drawer overflow-y-auto md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:max-h-[85vh] md:rounded-2xl"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Drag indicator (mobile) */}
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1 bg-card rounded-t-3xl md:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-4 pb-2 gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-foreground">{t('share.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">Send via WeChat, WhatsApp or Line — or copy the link</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-6 space-y-5">
              {/* Property preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60 border border-border">
                {thumb && (
                  <img
                    src={thumb}
                    alt={property.title}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{property.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{property.suburb}</p>
                  <p className="text-sm font-display font-bold text-foreground mt-0.5">
                    {formatPrice(property.price, property.listingType ?? undefined)}
                  </p>
                </div>
              </div>

              {/* WeChat QR Section — primary international share */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="text-center mb-3">
                  <h3 className="font-display font-semibold text-foreground">WeChat — Scan to Share</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">微信分享</p>
                </div>
                <div className="flex justify-center">
                  <div ref={qrWrapperRef} className="p-3 rounded-xl bg-white border border-border">
                    <QRCodeSVG value={propertyUrl} size={qrSize} level="M" />
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Open WeChat → tap Scan → point at this code
                </p>
                <p className="text-center text-xs text-muted-foreground">打开微信 → 点击扫一扫 → 对准二维码</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={saveQR}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <Download size={14} />
                    {t('share.saveQR')}
                  </button>
                  <button
                    onClick={copyForWeChat}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <Copy size={14} />
                    {t('share.wechatCopy')}
                  </button>
                </div>
              </div>

              {/* Share buttons row */}
              <div>
                <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">
                  {t('share.more')}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => capture('whatsapp_share_clicked', { listing_id: property.id })}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <MessageCircle size={18} />
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{t('share.whatsapp')}</span>
                  </a>
                  <a
                    href={lineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => capture('line_share_clicked', { listing_id: property.id })}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                      LINE
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{t('share.line')}</span>
                  </a>
                  <button
                    onClick={copyLink}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground">
                      <Link2 size={18} />
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{t('share.copyLink')}</span>
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={nativeShare}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
                    >
                      <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Share2 size={18} />
                      </span>
                      <span className="text-[11px] font-medium text-foreground">{t('share.native')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ShareSheet;
