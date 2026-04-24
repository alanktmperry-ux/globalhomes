/**
 * Communication preference for a contact.
 * Stored as JSONB array on contacts.communication_preferences.
 * Validated server-side by trg_validate_communication_preferences.
 */
export type CommChannel =
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'phone'
  | 'wechat'
  | 'line'
  | 'in_app';

export interface CommPreference {
  channel: CommChannel;
  handle: string;
  is_primary: boolean;
}

export const COMM_CHANNELS: { value: CommChannel; label: string; placeholder: string; isPhone: boolean }[] = [
  { value: 'whatsapp', label: 'WhatsApp', placeholder: '+61 4xx xxx xxx', isPhone: true },
  { value: 'wechat', label: 'WeChat', placeholder: '+61 4xx xxx xxx or WeChat ID', isPhone: true },
  { value: 'line', label: 'Line', placeholder: '+61 4xx xxx xxx or @username', isPhone: true },
  { value: 'sms', label: 'SMS', placeholder: '+61 4xx xxx xxx', isPhone: true },
  { value: 'phone', label: 'Phone', placeholder: '+61 4xx xxx xxx', isPhone: true },
  { value: 'email', label: 'Email', placeholder: 'name@example.com', isPhone: false },
  { value: 'in_app', label: 'In-app', placeholder: 'User ID', isPhone: false },
];

export const COMM_CHANNEL_META: Record<CommChannel, { label: string; placeholder: string; isPhone: boolean }> =
  Object.fromEntries(COMM_CHANNELS.map(c => [c.value, c])) as any;

export const MAX_COMM_PREFERENCES = 5;

/**
 * Validate handle format roughly client-side (mirrors DB trigger).
 */
export function isValidHandle(channel: CommChannel, handle: string): boolean {
  const h = handle.trim();
  if (!h) return false;
  if (channel === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(h);
  if (channel === 'in_app') return true;
  // phone-style channels — allow IDs containing digits/+/-/() with at least 6 digits
  return /^[\d\s+\-()]{6,}$/.test(h);
}
