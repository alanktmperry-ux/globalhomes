import { Helmet } from "react-helmet-async";
import { Clock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

export default function PendingApprovalPage() {
  const { user } = useAuth();
  return (
    <>
      <Helmet>
        <title>Application received · ListHQ</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-2xl font-bold text-primary mb-8">ListHQ</div>

          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Clock className="text-primary" size={32} />
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-3">Application received</h1>
          <p className="text-muted-foreground mb-8">
            Your agent account is being reviewed. We'll email you within 24 hours once you've been
            approved.
          </p>

          <div className="bg-card border border-border rounded-xl p-5 text-left mb-6">
            <p className="text-sm font-medium text-foreground mb-3">What happens next:</p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>We verify your real estate licence</li>
              <li>You receive an approval email</li>
              <li>Log in and start your free trial</li>
            </ol>
          </div>

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
