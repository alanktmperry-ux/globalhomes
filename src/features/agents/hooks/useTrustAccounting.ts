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
  // joined data
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

  const fetchTransactions = useCallback(async (accountId?: string) => {
    if (!user) return;
    let query = supabase
      .from('trust_transactions')
      .select('*, contacts(first_name, last_name), properties(title, address)')
      .order('transaction_date', { ascending: false });
    if (accountId) query = query.eq('trust_account_id', accountId);
    const { data } = await query;
    if (data) {
      setTransactions(data.map((t: any) => ({
        ...t,
        contact: t.contacts || null,
        property: t.properties || null,
      })) as TrustTransaction[]);
    }
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

  const deleteTransaction = async (id: string) => {
    // We void instead of hard-delete (audit trail)
    const { error } = await supabase
      .from('trust_transactions')
      .update({ status: 'voided' } as any)
      .eq('id', id);
    if (error) throw error;
    await fetchTransactions();
  };

  const markAsCleared = async (id: string) => {
    if (!user) return;
    await updateTransaction(id, {
      status: 'completed',
    } as any);
  };

  const bulkMarkCleared = async () => {
    if (!user) return;
    const pendingIds = transactions.filter(t => t.status === 'pending').map(t => t.id);
    if (pendingIds.length === 0) return;
    const { error } = await supabase
      .from('trust_transactions')
      .update({ status: 'completed' } as any)
      .in('id', pendingIds);
    if (error) throw error;
    await Promise.all([fetchTransactions(), fetchAccounts()]);
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
    accounts, transactions, contacts, properties, loading,
    fetchAccounts, fetchTransactions,
    createAccount, createTransaction, updateTransaction,
    deleteTransaction, markAsCleared, bulkMarkCleared, reconcileTransaction,
  };
}
