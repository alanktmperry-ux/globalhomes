import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export interface TrustAccount {
  id: string;
  agency_id: string | null;
  agent_id: string | null;
  account_name: string;
  account_type: string;
  bsb: string | null;
  account_number: string | null;
  bank_name: string | null;
  current_balance: number;
  opening_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Unified ledger entry derived from trust_receipts (money in) or trust_payments (money out). */
export interface TrustTransaction {
  id: string;
  source_table: 'trust_receipts' | 'trust_payments';
  transaction_type: 'deposit' | 'withdrawal';
  category: string;
  amount: number;
  gst_amount: number;
  description: string | null;
  payee_name: string | null;
  client_name: string | null;
  property_address: string | null;
  property_id: string | null;
  contact_id: string | null;
  reference: string | null;
  status: string;
  transaction_date: string;
  payment_method: string | null;
  created_at: string;
  // joined
  contact?: { first_name: string; last_name: string | null } | null;
  property?: { title: string; address: string } | null;
}

export interface ContactOption {
  id: string;
  first_name: string;
  last_name: string | null;
}

export interface PropertyOption {
  id: string;
  title: string;
  address: string;
}

export function useTrustAccounting() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [transactions, setTransactions] = useState<TrustTransaction[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('trust_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAccounts(data as unknown as TrustAccount[]);
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    // Fetch receipts (money in)
    const { data: receipts } = await supabase
      .from('trust_receipts')
      .select('*')
      .order('date_received', { ascending: false });

    // Fetch payments (money out)
    const { data: payments } = await supabase
      .from('trust_payments')
      .select('*')
      .order('date_paid', { ascending: false });

    const mapped: TrustTransaction[] = [];

    if (receipts) {
      for (const r of receipts as any[]) {
        mapped.push({
          id: r.id,
          source_table: 'trust_receipts',
          transaction_type: 'deposit',
          category: r.purpose || r.type || 'deposit',
          amount: Number(r.amount) || 0,
          gst_amount: 0,
          description: r.description || null,
          payee_name: r.client_name || null,
          client_name: r.client_name || null,
          property_address: r.property_address || null,
          property_id: r.property_id || null,
          contact_id: null,
          reference: r.receipt_number || null,
          status: r.status || 'received',
          transaction_date: r.date_received || r.created_at?.split('T')[0] || '',
          payment_method: r.payment_method || null,
          created_at: r.created_at,
        });
      }
    }

    if (payments) {
      for (const p of payments as any[]) {
        mapped.push({
          id: p.id,
          source_table: 'trust_payments',
          transaction_type: 'withdrawal',
          category: p.purpose || p.type || 'disbursement',
          amount: Number(p.amount) || 0,
          gst_amount: 0,
          description: p.description || null,
          payee_name: p.payee_name || p.client_name || null,
          client_name: p.client_name || null,
          property_address: p.property_address || null,
          property_id: p.property_id || null,
          contact_id: null,
          reference: p.payment_number || p.reference || null,
          status: p.status || 'pending',
          transaction_date: p.date_paid || p.created_at?.split('T')[0] || '',
          payment_method: p.payment_method || null,
          created_at: p.created_at,
        });
      }
    }

    // Sort by date descending
    mapped.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    setTransactions(mapped);
  }, [user]);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .order('first_name');
    if (data) setContacts(data as ContactOption[]);
  }, [user]);

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('properties')
      .select('id, title, address')
      .order('title');
    if (data) setProperties(data as PropertyOption[]);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchAccounts(), fetchTransactions(), fetchContacts(), fetchProperties()]);
      setLoading(false);
    };
    load();
  }, [fetchAccounts, fetchTransactions, fetchContacts, fetchProperties]);

  const createAccount = async (account: Partial<TrustAccount>) => {
    const { data, error } = await supabase
      .from('trust_accounts')
      .insert(account as any)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Failed to create trust account — no data returned');
    await fetchAccounts();
    return data;
  };

  /** Create a receipt (money in) or payment (money out). */
  const createTransaction = async (tx: {
    type: 'receipt' | 'payment';
    agent_id: string;
    client_name: string;
    property_address: string;
    amount: number;
    payment_method?: string;
    purpose?: string;
    description?: string;
    property_id?: string | null;
    reference?: string;
  }) => {
    if (!user) return null;

    if (tx.type === 'receipt') {
      const ref = tx.reference || `TR-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('trust_receipts')
        .insert({
          agent_id: tx.agent_id,
          receipt_number: ref,
          client_name: tx.client_name,
          property_address: tx.property_address,
          amount: tx.amount,
          payment_method: tx.payment_method || 'eft',
          purpose: tx.purpose || 'deposit',
          date_received: new Date().toISOString().split('T')[0],
          description: tx.description || null,
          property_id: tx.property_id || null,
        } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Failed to create trust receipt — no data returned');
      await Promise.all([fetchAccounts(), fetchTransactions()]);
      return data;
    } else {
      const ref = tx.reference || `TP-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('trust_payments')
        .insert({
          agent_id: tx.agent_id,
          payment_number: ref,
          client_name: tx.client_name,
          property_address: tx.property_address,
          amount: tx.amount,
          payment_method: tx.payment_method || 'eft',
          purpose: tx.purpose || 'refund',
          date_paid: new Date().toISOString().split('T')[0],
          description: tx.description || null,
          property_id: tx.property_id || null,
        } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Failed to create trust payment — no data returned');
      await Promise.all([fetchAccounts(), fetchTransactions()]);
      return data;
    }
  };

  /** Trust entries are immutable. To "void" a receipt/payment, insert a correction entry that reverses the original amount. */
  const voidTransaction = async (id: string, sourceTable: 'trust_receipts' | 'trust_payments') => {
    if (!user) return;
    // Find the original transaction
    const original = transactions.find(t => t.id === id && t.source_table === sourceTable);
    if (!original) throw new Error('Transaction not found');

    // Insert a reversal entry with negative amount
    if (sourceTable === 'trust_receipts') {
      const ref = `TR-VOID-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase
        .from('trust_receipts')
        .insert({
          agent_id: (await supabase.from('trust_receipts').select('agent_id').eq('id', id).maybeSingle()).data?.agent_id,
          receipt_number: ref,
          client_name: original.client_name || '',
          property_address: original.property_address || '',
          amount: -(original.amount),
          payment_method: original.payment_method || 'eft',
          purpose: 'voided',
          date_received: new Date().toISOString().split('T')[0],
          description: `Void of ${original.reference || id}`,
          property_id: original.property_id || null,
        } as any);
      if (error) throw error;
    } else {
      const ref = `TP-VOID-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase
        .from('trust_payments')
        .insert({
          agent_id: (await supabase.from('trust_payments').select('agent_id').eq('id', id).maybeSingle()).data?.agent_id,
          payment_number: ref,
          client_name: original.client_name || '',
          property_address: original.property_address || '',
          amount: -(original.amount),
          payment_method: original.payment_method || 'eft',
          purpose: 'voided',
          date_paid: new Date().toISOString().split('T')[0],
          description: `Void of ${original.reference || id}`,
          property_id: original.property_id || null,
        } as any);
      if (error) throw error;
    }

    await Promise.all([fetchTransactions(), fetchAccounts()]);
  };

  return {
    accounts, transactions, contacts, properties, loading,
    fetchAccounts, fetchTransactions,
    createAccount, createTransaction,
    voidTransaction,
  };
}
