import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/shared/hooks/use-toast";
import { getErrorMessage } from "@/shared/lib/errorUtils";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  language_preference: string | null;
  email_unsubscribed: boolean | null;
  email_unsubscribed_at: string | null;
};

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAgent, setIsAgent] = useState(false);

  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, language_preference, email_unsubscribed, email_unsubscribed_at")
      .eq("id", user.id)
      .maybeSingle();

    const { data: agentRow } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
      setForm({ fullName: data.full_name ?? "", phone: data.phone ?? "" });
    }
    setIsAgent(!!agentRow);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const saveDetails = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.fullName, phone: form.phone })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Saved", description: "Your details have been updated." });
      load();
    } catch (e) {
      toast({ title: "Couldn't save", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifications = async () => {
    if (!user || !profile) return;
    const newValue = !profile.email_unsubscribed;
    const { error } = await supabase
      .from("profiles")
      .update({
        email_unsubscribed: newValue,
        email_unsubscribed_at: newValue ? new Date().toISOString() : null,
      })
      .eq("id", user.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: newValue ? "Unsubscribed" : "Subscribed",
      description: newValue
        ? "You won't receive property match emails."
        : "You'll receive property match emails again.",
    });
    load();
  };

  const updatePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated", description: "Your password has been changed." });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-sm text-slate-600">We couldn't load your profile.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Account settings · ListHQ</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-2xl font-semibold text-slate-900 mb-8">Account settings</h1>

        {/* Section 1 — Personal details */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Personal details</h2>
          <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email ?? ""} disabled />
              <p className="mt-1 text-xs text-slate-500">
                Email cannot be changed here. Contact{" "}
                <a href="mailto:support@listhq.com.au" className="underline">
                  support@listhq.com.au
                </a>
                .
              </p>
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+61 4xx xxx xxx"
              />
            </div>
            <Button onClick={saveDetails} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </section>

        <hr className="border-slate-200 my-8" />

        {/* Section 2 — Notifications */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Notifications</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Property match emails</p>
                <p className="mt-1 text-xs text-slate-600">
                  Get notified by email when a new listing matches your Halo.
                </p>
                {profile.email_unsubscribed && profile.email_unsubscribed_at && (
                  <p className="mt-2 text-xs text-amber-700">
                    Unsubscribed{" "}
                    {new Date(profile.email_unsubscribed_at).toLocaleDateString("en-AU")}
                  </p>
                )}
              </div>
              <Switch
                checked={!profile.email_unsubscribed}
                onCheckedChange={toggleNotifications}
              />
            </div>
          </div>
        </section>

        {!isAgent && (
          <>
            <hr className="border-slate-200 my-8" />
            {/* Section 3 — Halo (buyer only) */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Halo</h2>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-sm text-slate-600">
                  Your Halo defines what properties you're looking for. Keep it up to date to
                  receive the best matches.
                </p>
                <Link
                  to="/halo/edit"
                  className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                >
                  Edit your Halo →
                </Link>
              </div>
            </section>
          </>
        )}

        <hr className="border-slate-200 my-8" />

        {/* Section 4 — Security */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Security</h2>
          <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
            <div>
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
            <Button onClick={updatePassword} disabled={changingPassword || !newPassword}>
              {changingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
