import { Helmet } from 'react-helmet-async';

const TermsPage = () => (
  <>
    <Helmet>
      <title>Terms of Service | Global Homes</title>
      <meta name="description" content="Terms of Service for Global Homes, an Australian-based global real estate platform." />
    </Helmet>
    <main className="bg-background">
      <article className="max-w-3xl mx-auto px-4 py-16 prose prose-neutral dark:prose-invert">
        <h1 className="font-display text-3xl font-extrabold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: 18 March 2026</p>

        <h2>1. About Global Homes</h2>
        <p>
          Global Homes Pty Ltd (ABN 00 000 000 000) operates the Global Homes platform from Victoria, Australia.
          By accessing or using the platform you agree to be bound by these terms.
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
          credentials secure. You are responsible for all activity under your account.
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

        <h2>6. Trust Accounting</h2>
        <p>
          Where trust accounting features are used, agents remain solely responsible for compliance with the
          trust account provisions of the <em>Estate Agents Act 1980</em> (Vic) and applicable regulations.
          Global Homes does not hold, manage, or guarantee any trust funds.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          All platform content, design, and technology are the property of Global Homes Pty Ltd or its licensors.
          User-submitted content (listings, images) remains the property of the submitter, with a licence granted
          to Global Homes for display purposes.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by the <em>Competition and Consumer Act 2010</em> (Cth), Global Homes
          excludes liability for indirect, incidental, or consequential damages. The platform is provided
          "as is" without warranties of any kind.
        </p>

        <h2>9. Termination</h2>
        <p>
          We may suspend or terminate your account at any time for breach of these terms. You may close your
          account at any time by contacting support.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These terms are governed by the laws of the State of Victoria, Australia. Any disputes will be
          subject to the exclusive jurisdiction of the courts of Victoria.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these terms can be directed to{' '}
          <a href="mailto:legal@globalhomes.com.au" className="text-primary hover:underline">
            legal@globalhomes.com.au
          </a>.
        </p>
      </article>
    </main>
  </>
);

export default TermsPage;
