export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Who we are</h2>
          <p className="text-foreground/90 leading-relaxed">
            ListHQ is operated by Square Development Pty Ltd (ABN to be added). We provide
            a property listing and buyer-matching platform for Australian real estate
            agents and property seekers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-foreground/90">
            <li>Account information (name, email, phone)</li>
            <li>Agent professional details (licence number, agency, suburbs)</li>
            <li>Buyer property preferences (Halo data)</li>
            <li>Property listings and associated content</li>
            <li>Platform usage data (page views, feature interactions)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">How we use it</h2>
          <ul className="list-disc pl-5 space-y-1 text-foreground/90">
            <li>To operate and improve the platform</li>
            <li>To match buyers with suitable listings</li>
            <li>To send transactional emails (match alerts, account notices)</li>
            <li>To comply with Australian real estate regulations</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Your rights</h2>
          <p className="text-foreground/90 leading-relaxed">
            Under the Australian Privacy Act 1988, you have the right to access, correct,
            or request deletion of your personal information. Contact us at{' '}
            <a href="mailto:support@listhq.com.au" className="underline">
              support@listhq.com.au
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Cookies</h2>
          <p className="text-foreground/90 leading-relaxed">
            We use cookies for authentication and session management. We do not use
            third-party advertising cookies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p className="text-foreground/90 leading-relaxed">
            Square Development Pty Ltd<br />
            <a href="mailto:support@listhq.com.au" className="underline">
              support@listhq.com.au
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPage;
