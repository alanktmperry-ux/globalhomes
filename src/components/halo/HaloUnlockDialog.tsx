import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Lock } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  busy: boolean;
  onConfirm: () => void;
}

export function HaloUnlockDialog({ open, onOpenChange, balance, busy, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="bg-white rounded-3xl max-w-[460px] w-full p-8 mx-4 border-0"
        style={{ boxShadow: '0 30px 90px rgba(0,0,0,0.15)' }}
      >
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center">
            <Lock size={32} color="#2563EB" style={{ display: 'inline-flex', flexShrink: 0 }} />
          </div>
          <h2 className="text-[22px] font-extrabold text-[#0a0f1e] text-center mt-5 tracking-[-0.02em]">
            Unlock this Halo?
          </h2>
          <p className="text-[14px] text-[#6a6a6a] text-center mt-3 max-w-[340px] mx-auto leading-[1.55]">
            You'll get the seeker's contact details immediately and can message or call them directly.
          </p>
        </div>

        <div className="bg-[#F9FAFB] rounded-2xl p-4 mt-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.10em] text-[#6a6a6a] font-bold">
              Your credits
            </div>
            <div className="text-[18px] font-extrabold text-[#0a0f1e] tabular-nums mt-1">
              {balance}
            </div>
          </div>
          <div className="text-[18px] font-extrabold text-[#DC2626] tabular-nums">−1</div>
        </div>

        <AlertDialogFooter className="mt-6 flex gap-3 sm:gap-3">
          <AlertDialogCancel
            disabled={busy}
            className="flex-1 m-0 bg-white border border-[#E5E5E5] rounded-full py-3 text-[14px] font-bold text-[#6a6a6a] hover:bg-[#F9FAFB]"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={onConfirm}
            className="flex-1 m-0 rounded-full py-3 text-[14px] font-extrabold text-white border-0"
            style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}
          >
            Confirm unlock
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default HaloUnlockDialog;
