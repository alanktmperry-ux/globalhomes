/**
 * BrokerLogin.tsx
 * Magic link login page for broker partners.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, CheckCircle } from "lucide-react";

type LoginStatus = "idle" | "loading" | "sent" | "error";

export default function BrokerLogin() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSendLink = async () => {
    if (!isValidEmail || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");

    // Preserve invite token across the magic-link round-trip
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");
    const redirect = inviteToken
      ? `${window.location.origin}/broker/portal?invite=${inviteToken}`
      : `${window.location.origin}/broker/portal`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        emailRedirectTo: redirect,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setErrorMsg("Something went wrong. Please try again or contact ListHQ.");
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">ListHQ</h1>
          <p className="text-sm text-muted-foreground mt-1">Broker Partner Portal</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          {status === "sent" ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto mb-3 text-green-500" size={48} />
              <h2 className="text-lg font-semibold text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a login link to <span className="font-medium text-foreground">{email}</span>. Click it to access your portal.
                The link expires in 60 minutes.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-6 text-sm text-primary underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">Sign in</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Enter your registered broker email and we'll send you a one-click login link.
              </p>

              <input
                type="email"
                placeholder="broker@email.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendLink()}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              />

              {status === "error" && (
                <p className="text-sm text-destructive mb-3">{errorMsg}</p>
              )}

              <Button
                className="w-full h-10"
                onClick={handleSendLink}
                disabled={!isValidEmail || status === "loading"}
              >
                {status === "loading" ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Sending…</>
                ) : (
                  <><Mail size={16} className="mr-2" /> Send login link</>
                )}
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Not a registered broker?{" "}
          <a href="mailto:alanperry@gmail.com" className="underline">Contact ListHQ</a>.
        </p>
      </div>
    </div>
  );
}
