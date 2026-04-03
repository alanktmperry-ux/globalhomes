import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VendorReportToken } from '../types';

export function useVendorToken(propertyId: string, agentId: string) {
  const [token, setToken] = useState<VendorReportToken | null>(null);
  const [creating, setCreating] = useState(false);

  async function createToken(vendorName?: string, vendorEmail?: string) {
    setCreating(true);
    const { data, error } = await supabase
      .from('vendor_report_tokens' as any)
      .insert({ property_id: propertyId, agent_id: agentId, vendor_name: vendorName, vendor_email: vendorEmail })
      .select()
      .single();
    if (!error && data) setToken(data as unknown as VendorReportToken);
    setCreating(false);
    return data as unknown as VendorReportToken | null;
  }

  async function sendVendorEmail(tokenValue: string, vendorEmail: string) {
    await supabase.functions.invoke('send-vendor-report-link', {
      body: { token: tokenValue, vendor_email: vendorEmail, property_id: propertyId },
    });
  }

  return { token, creating, createToken, sendVendorEmail };
}
