import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OpenHomeSignInPage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    supabase
      .from('open_homes')
      .select('*')
      .eq('qr_token', token)
      .single()
      .then(async ({ data: oh }) => {
        if (!oh) { setLoading(false); return; }
        setSession(oh);
        const { data: prop } = await supabase
          .from('properties')
          .select('address, suburb, images')
          .eq('id', oh.property_id)
          .single();
        setProperty(prop);
        setLoading(false);
      });
  }, [token]);

  const handleSignIn = async () => {
    if (!email || !session) return;
    setSigningIn(true);
    setError(null);

    const normalizedEmail = email.toLowerCase().trim();

    // Try to mark existing registration as attended
    const { data: existing } = await supabase
      .from('open_home_registrations')
      .select('id')
      .eq('open_home_id', session.id)
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      await supabase
        .from('open_home_registrations')
        .update({ attended: true, attended_at: new Date().toISOString() } as any)
        .eq('id', existing.id);
    } else {
      // Walk-in — insert as attended
      await supabase.from('open_home_registrations').insert({
        open_home_id: session.id,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        attended: true,
        attended_at: new Date().toISOString(),
        on_waitlist: false,
      } as any);
    }

    setSignedIn(true);
    setSigningIn(false);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">Invalid or expired QR code</p>
        <p className="text-sm text-muted-foreground mt-2">Please ask the agent for the correct link.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
        {property?.images?.[0] && (
          <img src={property.images[0]} alt="" className="w-full h-48 object-cover" />
        )}

        <div className="p-6 space-y-5">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">{property?.address}</h1>
            <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin size={14} /> {property?.suburb}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {new Date(session.starts_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })} – {new Date(session.ends_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>

          {signedIn ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle size={40} className="mx-auto text-green-500" />
              <p className="font-semibold text-foreground text-lg">You're signed in!</p>
              <p className="text-sm text-muted-foreground">
                Enjoy your inspection. The agent will follow up with you shortly.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Your email to sign in
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                />
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
              </div>
              <Button
                onClick={handleSignIn}
                disabled={signingIn || !email}
                className="w-full"
              >
                {signingIn ? 'Signing in…' : "I'm here — sign me in"}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Your details are shared with the listing agent only.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
