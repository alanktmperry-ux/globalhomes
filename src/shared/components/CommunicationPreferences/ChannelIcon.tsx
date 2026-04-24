import { Mail, MessageSquare, Phone, Smartphone, Bell } from 'lucide-react';
import type { CommChannel } from './types';

interface ChannelIconProps {
  channel: CommChannel;
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Icon for a communication channel.
 * For brand-specific apps without a lucide icon (WhatsApp, WeChat, Line) we
 * use a coloured circle with the first letter — keeps the row compact and
 * stays inside the design system without pulling in a brand icon library.
 */
export function ChannelIcon({ channel, size = 14, className = '', title }: ChannelIconProps) {
  const tip = title ?? channel;
  switch (channel) {
    case 'email':
      return <Mail size={size} className={className} aria-label={tip} />;
    case 'phone':
      return <Phone size={size} className={className} aria-label={tip} />;
    case 'sms':
      return <MessageSquare size={size} className={className} aria-label={tip} />;
    case 'in_app':
      return <Bell size={size} className={className} aria-label={tip} />;
    case 'whatsapp':
      return <BrandBadge letter="W" tone="bg-emerald-500" size={size} title={tip} />;
    case 'wechat':
      return <BrandBadge letter="微" tone="bg-green-600" size={size} title={tip} />;
    case 'line':
      return <BrandBadge letter="L" tone="bg-lime-500" size={size} title={tip} />;
    default:
      return <Smartphone size={size} className={className} aria-label={tip} />;
  }
}

function BrandBadge({ letter, tone, size, title }: { letter: string; tone: string; size: number; title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center rounded-full text-[9px] font-bold text-white ${tone}`}
      style={{ width: size + 2, height: size + 2, lineHeight: 1 }}
    >
      {letter}
    </span>
  );
}
