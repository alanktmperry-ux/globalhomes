import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const siteUrl = Deno.env.get('SITE_URL') || 'https://listhq.com.au';

  if (!token) {
    return Response.redirect(`${siteUrl}?review=invalid`, 302);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Lookup token
  const { data: tokenRow } = await supabase
    .from('review_verify_tokens')
    .select('id, review_id, used_at, expires_at')
    .eq('token', token)
    .single();

  if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at) < new Date()) {
    return Response.redirect(`${siteUrl}?review=expired`, 302);
  }

  // Mark review as verified and approved
  await supabase
    .from('agent_reviews')
    .update({ verified: true, status: 'approved' } as any)
    .eq('id', tokenRow.review_id);

  // Mark token as used
  await supabase
    .from('review_verify_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  // Get agent slug for redirect
  const { data: review } = await supabase
    .from('agent_reviews')
    .select('agent_id')
    .eq('id', tokenRow.review_id)
    .single();

  const redirectUrl = review
    ? `${siteUrl}/agent/${review.agent_id}?review=verified`
    : `${siteUrl}?review=verified`;

  return Response.redirect(redirectUrl, 302);
});
