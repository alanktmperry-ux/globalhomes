import { Helmet } from 'react-helmet-async';

const TermsPage = () => (
  <>
    <Helmet>
      <title>Terms of Service</title>
      <meta name="description" content="Terms of Service for ListHQ, an Australian-based global real estate platform." />
    </Helmet>
    <main className="bg-background">
      <article className="max-w-3xl mx-auto px-4 py-16 prose prose-neutral dark:prose-invert">
        <h1 className="font-display text-3xl font-extrabold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: 29 March 2026 · Version 1.0</p>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ This document is pending solicitor review before final publication.</p>

        <h2>1. About ListHQ</h2>
        <p>
          ListHQ Pty Ltd (ABN 65 608 526 781) operates the ListHQ platform from Victoria, Australia.
          By accessing or using the platform you agree to be bound by these terms.
          ListHQ is a technology platform — it is <strong>not</strong> a licensed real estate agency and
          does not provide legal, financial, or real estate advice.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years of age and legally capable of entering contracts under Australian law.
          Licensed real estate agents must hold a valid licence under the <em>Estate Agents Act 1980</em> (Vic)
          or equivalent legislation in their jurisdiction to list properties.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          You agree to provide accurate, current and complete information during registration and to keep your
          credentials secure. You are responsible for all activity under your account. By creating an account
          you accept these Terms and our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>

        <h2>4. Platform Use</h2>
        <p>
          The platform is provided for legitimate real estate search, listing, and communication purposes.
          You must not use the platform for any unlawful purpose, to harass other users, or to transmit
          harmful or misleading content.
        </p>

        <h2>5. Property Listings</h2>
        <p>
          Agents are responsible for the accuracy and legality of all listing information, including pricing,
          property descriptions, and photographs. All listings must comply with the <em>Australian Consumer Law</em>
          and relevant state fair trading legislation.
        </p>

        <h2>6. Agent Subscription Terms</h2>
        <p>
          Agent subscriptions are billed on a recurring basis via Stripe. By subscribing you
          authorise ListHQ to charge your nominated payment method at the start of each billing
          period. Subscriptions auto-renew unless cancelled before the renewal date.
        </p>
        <p>
          Plan tiers (Starter, Professional, Agency, Enterprise) differ in listing limits, team seats,
          and premium features. Feature access may change between plan tiers at ListHQ's discretion
          with 30 days notice.
        </p>
        <p>
          Refunds are assessed on a case-by-case basis in accordance with the{' '}
          <em>Australian Consumer Law</em>. Where a statutory guarantee applies, ListHQ will
          provide a remedy as required by law. No refunds are issued for partial billing periods
          unless required by law.
        </p>
        <p>
          You may cancel your subscription at any time from your billing settings. Access
          continues until the end of the paid period.
        </p>

        <h2>7. Lead Marketplace</h2>
        <p>
          The Lead Marketplace allows agents to purchase buyer leads generated through the platform.
          ListHQ does not guarantee the quality, accuracy, or conversion rate of any lead.
          Lead data is provided as-is based on buyer search activity. Purchased leads are non-refundable
          once accessed. Agents are responsible for their own follow-up and compliance with privacy law
          when contacting leads.
        </p>

        <h2>8. AI-Generated Content</h2>
        <p>
          ListHQ provides AI-powered features including offer letter drafting, buyer matching, and
          property descriptions. All AI-generated content is provided as an <strong>administrative aid only</strong>
          {' '}and does not constitute legal, financial, or professional advice. Agents must review all
          AI-generated content before use and remain solely responsible for its accuracy and legal compliance.
        </p>

        <h2>9. Trust Accounting</h2>
        <p>
          Where trust accounting features are used, agents remain solely responsible for compliance with the
          trust account provisions of the <em>Estate Agents Act 1980</em> (Vic) and applicable regulations.
          ListHQ does not hold, manage, or guarantee any trust funds.
        </p>

        <h2>10. Intellectual Property</h2>
        <p>
          All platform content, design, and technology are the property of ListHQ Pty Ltd or its licensors.
          User-submitted content (listings, images) remains the property of the submitter, with a licence granted
          to ListHQ for display purposes on the platform.
        </p>

        <h2>11. Data Collection &amp; Privacy</h2>
        <p>
          We collect and process personal information in accordance with our{' '}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and the{' '}
          <em>Privacy Act 1988</em> (Cth). By using the platform you consent to data collection as described
          in the Privacy Policy.
        </p>

        <h2>12. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by the <em>Competition and Consumer Act 2010</em> (Cth), ListHQ
          excludes liability for indirect, incidental, or consequential damages. The platform is provided
          "as is" without warranties of any kind.
        </p>

        <h2>13. Termination</h2>
        <p>
          We may suspend or terminate your account at any time for breach of these terms, including
          misrepresentation of licensing status, misuse of trust accounting features, or harassment
          of other users. You may close your account at any time by contacting support.
        </p>

        <h2>14. Dispute Resolution</h2>
        <p>
          Before commencing legal proceedings, the parties agree to attempt resolution through good faith
          negotiation for a minimum of 14 days. If unresolved, disputes may be referred to mediation
          administered by the Resolution Institute (Australia). Nothing in this clause limits your rights
          under Australian Consumer Law.
        </p>

        <h2>15. Governing Law</h2>
        <p>
          These terms are governed by the laws of the State of Victoria, Australia. Any disputes will be
          subject to the exclusive jurisdiction of the courts of Victoria.
        </p>

        <h2>16. Changes to These Terms</h2>
        <p>
          We may update these terms from time to time. Material changes will be communicated via email
          or an in-app notification at least 14 days before taking effect. Continued use after the
          effective date constitutes acceptance.
        </p>

        <h2>17. Contact</h2>
        <p>
          Questions about these terms can be directed to{' '}
          <a href="mailto:legal@listhq.com.au" className="text-primary hover:underline">
            legal@listhq.com.au
          </a>.
        </p>
        <p>
          Legal notices may be sent to: ListHQ Pty Ltd, Victoria, Australia.
        </p>
      </article>
    </main>
  </>
);

export default TermsPage;
