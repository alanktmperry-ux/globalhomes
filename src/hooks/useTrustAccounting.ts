import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';

export interface TrustAccount {
  id: string;
  agency_id: string | null;
  agent_id: string | null;
  account_name: string;
  account_type: string;
  bsb: string | null;
  account_number: string | null;
  bank_name: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrustTransaction {
  id: string;
  trust_account_id: string;
  property_id: string | null;
  contact_id: string | null;
  created_by: string;
  transaction_type: string;
  category: string;
  amount: number;
  gst_amount: number;
  description: string | null;
  reference: string | null;
  payee_name: string | null;
  status: string;
  transaction_date: string;
  due_date: string | null;
  invoice_number: string | null;
  receipt_number: string | null;
  reconciled_at: string | null;
  reconciled_by: string | null;
  aba_exported: boolean;
  aba_exported_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTrustAccounting() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [transactions, setTransactions] = useState<TrustTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('trust_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAccounts(data as unknown as TrustAccount[]);
  }, [user]);

  const fetchTransactions = useCallback(async (accountId?: string) => {
    if (!user) return;
    let query = supabase
      .from('trust_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });
    if (accountId) query = query.eq('trust_account_id', accountId);
    const { data } = await query;
    if (data) setTransactions(data as unknown as TrustTransaction[]);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchAccounts();
      await fetchTransactions();
      setLoading(false);
    };
    load();
  }, [fetchAccounts, fetchTransactions]);

  const createAccount = async (account: Partial<TrustAccount>) => {
    const { data, error } = await supabase
      .from('trust_accounts')
      .insert(account as any)
      .select()
      .single();
    if (error) throw error;
    await fetchAccounts();
    return data;
  };

  const createTransaction = async (tx: Partial<TrustTransaction>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('trust_transactions')
      .insert({ ...tx, created_by: user.id } as any)
      .select()
      .single();
    if (error) throw error;
    // Update account balance
    if (tx.trust_account_id && tx.status === 'completed') {
      const account = accounts.find(a => a.id === tx.trust_account_id);
      if (account) {
        const delta = tx.transaction_type === 'deposit' ? (tx.amount || 0) : -(tx.amount || 0);
        await supabase
          .from('trust_accounts')
          .update({ balance: account.balance + delta } as any)
          .eq('id', tx.trust_account_id);
      }
    }
    await fetchAccounts();
    await fetchTransactions();
    return data;
  };

  const updateTransaction = async (id: string, updates: Partial<TrustTransaction>) => {
    const { error } = await supabase
      .from('trust_transactions')
      .update(updates as any)
      .eq('id', id);
    if (error) throw error;
    await fetchTransactions();
  };

  const reconcileTransaction = async (id: string) => {
    if (!user) return;
    await updateTransaction(id, {
      status: 'reconciled',
      reconciled_at: new Date().toISOString(),
      reconciled_by: user.id,
    } as any);
  };

  return {
    accounts, transactions, loading,
    fetchAccounts, fetchTransactions,
    createAccount, createTransaction, updateTransaction, reconcileTransaction,
  };
}
