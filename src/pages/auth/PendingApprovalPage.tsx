import { Helmet } from "react-helmet-async";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePageTitle } from '@/lib/usePageTitle';

export default function PendingApprovalPage() {
  usePageTitle('Complete your registration');
  const { user } = useAuth();
  return (
    <>
      <Helmet>
        <title>Complete your registration · ListHQ</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-2xl font-bold text-primary mb-8">ListHQ</div>

          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Sparkles className="text-primary" size={32} />
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-3">Complete your registration</h1>
          <p className="text-muted-foreground mb-8">
            Your account is almost ready. Complete your agency profile to get started.
          </p>

          <div className="bg-card border border-border rounded-xl p-5 text-left mb-6">
            <p className="text-sm font-medium text-foreground mb-3">What happens next:</p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Complete your agency profile</li>
              <li>Start your free 60-day trial — no credit card required</li>
              <li>Your listings go live immediately</li>
            </ol>
          </div>

          <a
            href="/onboarding/agency"
            className="inline-block w-full bg-primary text-primary-foreground rounded-xl py-3 px-6 font-medium hover:bg-primary/90 transition-colors mb-6"
          >
            Complete registration →
          </a>

          {user?.email && (
            <p className="text-xs text-muted-foreground mb-2">Signed in as {user.email}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Questions? Email{" "}
            <a href="mailto:alan@squaredevelopment.com.au" className="underline">
              alan@squaredevelopment.com.au
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
