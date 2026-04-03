import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Building2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

type Mode = 'login' | 'register';

export default function StrataAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Registration fields
  const [companyName, setCompanyName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [state, setState] = useState('NSW');
  const [phone, setPhone] = useState('');
  const [abn, setAbn] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate('/strata-dashboard');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) { toast.error('Company name is required'); return; }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: companyName } },
    });

    if (authError) { setLoading(false); toast.error(authError.message); return; }
    if (!authData.user) { setLoading(false); toast.error('Registration failed'); return; }

    // Create strata_manager record
    const { error: smError } = await supabase.from('strata_managers').insert({
      user_id: authData.user.id,
      company_name: companyName,
      licence_number: licenceNumber || null,
      state,
      phone: phone || null,
      abn: abn || null,
    });

    if (smError) console.error('Strata manager insert error:', smError);

    // Assign role
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: authData.user.id,
      role: 'strata_manager' as any,
    });
    if (roleError) console.error('Role insert error:', roleError);

    setLoading(false);
    toast.success('Check your email to confirm your account');
  };

  return (
    <>
      <Helmet><title>{mode === 'login' ? 'Strata Login' : 'Strata Registration'}</title></Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="text-primary" size={24} />
            </div>
            <CardTitle>{mode === 'login' ? 'Strata Manager Login' : 'Register as Strata Manager'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
              <div><Label>Email</Label><Input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>

              {mode === 'register' && (
                <>
                  <div><Label>Company Name *</Label><Input required value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
                  <div><Label>Licence Number</Label><Input value={licenceNumber} onChange={e => setLicenceNumber(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>State *</Label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>ABN</Label><Input value={abn} onChange={e => setAbn(e.target.value)} /></div>
                  </div>
                  <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin mr-2" size={16} />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {mode === 'login' ? (
                <>Don't have an account? <button onClick={() => setMode('register')} className="text-primary hover:underline">Register</button></>
              ) : (
                <>Already registered? <button onClick={() => setMode('login')} className="text-primary hover:underline">Sign in</button></>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
