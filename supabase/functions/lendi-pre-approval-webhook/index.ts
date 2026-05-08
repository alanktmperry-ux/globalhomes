import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookBody {
  broker_api_key?: string;
  user_id?: string;
  approved_amount?: number;
  expiry_date?: string;
  lender_name?: string;
  status?: 'approved' | 'declined';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as WebhookBody;
    const {
      broker_api_key,
      user_id,
      approved_amount,
      expiry_date,
      lender_name,
      status,
    } = body;

    if (!broker_api_key || !user_id || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: broker, error: brokerError } = await supabase
      .from('brokers')
      .select('id')
      .eq('api_key', broker_api_key)
      .maybeSingle();

    if (brokerError || !broker) {
      return new Response(JSON.stringify({ error: 'Invalid broker API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let approvalId: string | null = null;

    if (status === 'approved') {
      const { data, error } = await supabase
        .from('buyer_pre_approvals')
        .upsert(
          {
            user_id,
            approved_amount: approved_amount ?? null,
            expiry_date: expiry_date ?? null,
            lender_name: lender_name ?? null,
            status: 'verified',
            document_type: 'broker_api',
            document_url: '',
            verified_at: new Date().toISOString(),
            verified_by: lender_name ?? null,
          },
          { onConflict: 'user_id' },
        )
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('upsert approved error', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      approvalId = data?.id ?? null;
    } else if (status === 'declined') {
      const { data, error } = await supabase
        .from('buyer_pre_approvals')
        .insert({
          user_id,
          approved_amount: approved_amount ?? null,
          expiry_date: expiry_date ?? null,
          lender_name: lender_name ?? null,
          status: 'rejected',
          rejection_reason: 'Not approved by lender',
          document_type: 'broker_api',
          document_url: '',
        })
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('insert declined error', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      approvalId = data?.id ?? null;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (approvalId) {
      try {
        await supabase.functions.invoke('notify-pre-approval-result', {
          body: { approval_id: approvalId },
        });
      } catch (e) {
        console.error('notify-pre-approval-result invoke failed', e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('webhook error', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
