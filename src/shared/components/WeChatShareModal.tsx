import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Property } from '@/shared/lib/types';
import { useCurrency } from '@/shared/lib/CurrencyContext';

interface WeChatShareModalProps {
  property: Property;
  open: boolean;
  onClose: () => void;
}

export function WeChatShareModal({ property, open, onClose }: WeChatShareModalProps) {
  const { formatPrice } = useCurrency();
  const propertyUrl = `${window.location.origin}/property/${property.id}`;

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(propertyUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

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
            aria-label="Share to WeChat"
            className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl shadow-xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          >
            <div className="flex items-start justify-between px-5 pt-4 pb-2 gap-3">
              <h2 className="font-display text-lg font-semibold text-foreground">Share to WeChat</h2>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-6 space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-xl bg-white border border-border">
                  <QRCodeSVG value={propertyUrl} size={220} level="M" includeMargin={false} />
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">Scan with WeChat to view this property</p>
                <p className="text-sm text-muted-foreground">用微信扫码查看房源</p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/60 border border-border text-center">
                <p className="text-sm font-semibold text-foreground truncate">{property.title}</p>
                <p className="text-base font-display font-bold text-foreground mt-0.5">
                  {formatPrice(property.price, property.listingType ?? undefined)}
                </p>
              </div>

              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <Copy size={15} />
                Copy link
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
