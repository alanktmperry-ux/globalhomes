import { supabase } from '@/integrations/supabase/client';

/**
 * Invoke the admin-users edge function with explicit auth token.
 * supabase.functions.invoke() sometimes fails to attach the session JWT,
 * so we manually set the Authorization header from the current session.
 */
export async function callAdminFunction(action: string, body?: Record<string, any>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error('No active session. Please sign in again.');
  }

  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...body },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Request failed');
  }
  return data;
}
