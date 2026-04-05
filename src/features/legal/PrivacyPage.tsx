import { Helmet } from 'react-helmet-async';

const PrivacyPage = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy</title>
        <meta name="description" content="Privacy Policy for ListHQ — how we collect, use, and protect your personal information." />
      </Helmet>
      <main className="bg-background">
        <article className="max-w-3xl mx-auto px-4 py-16 prose prose-neutral dark:prose-invert">
          <h1 className="font-display text-3xl font-extrabold text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: 29 March 2026</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ This document is pending solicitor review before final publication.</p>

          <h2>1. Overview</h2>
          <p>
            ListHQ Pty Ltd (ABN 65 608 526 781) is committed to protecting your personal information in
            accordance with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs).
            This policy explains how we collect, use, disclose, and safeguard your data. For international users,
            we also comply with relevant provisions of the <em>General Data Protection Regulation</em> (GDPR).
          </p>

          <h2>2. Information We Collect</h2>
          <ul>
            <li><strong>Account data:</strong> name, email address, phone number, and profile photo.</li>
            <li><strong>Agent data:</strong> licence number, licence state, agency name, ABN, office address, trust account details, and subscription details.</li>
            <li><strong>Seeker data:</strong> search queries, location preferences, budget range, and contact details (if submitted via Lead Marketplace or property enquiries).</li>
            <li><strong>Tenancy data:</strong> tenant names, rent amounts, payment history, lease dates, and maintenance records.</li>
            <li><strong>Search data:</strong> search queries, voice transcripts, saved searches, and location preferences.</li>
            <li><strong>Usage data:</strong> pages visited, features used, device type, IP address, and browser information.</li>
            <li><strong>Transaction data:</strong> property enquiries, lead details, subscription payments, and communication history.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use personal information to:</p>
          <ul>
            <li>Provide and improve the platform and its features.</li>
            <li>Match buyers with relevant property listings.</li>
            <li>Facilitate communication between agents and buyers.</li>
            <li>Process subscription payments and manage billing.</li>
            <li>Send service notifications and, with your consent, marketing communications.</li>
            <li>Comply with legal obligations and regulatory requirements.</li>
          </ul>

          <h2>4. Voice Search Data</h2>
          <p>
            Voice searches are transcribed and processed to match you with relevant listings. Transcripts may be
            shared with listing agents as part of lead qualification. Voice search data is retained for{' '}
            <strong>90 days</strong> and then automatically deleted. You can delete your voice search history
            from your account settings at any time.
          </p>

          <h2>5. Disclosure of Information</h2>
          <p>We may share your personal information with:</p>
          <ul>
            <li>Licensed real estate agents for the purpose of property enquiries.</li>
            <li>Service providers who assist with hosting, analytics, and communications.</li>
            <li>Regulatory authorities when required by law.</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>

          <h2>6. Third-Party Service Providers</h2>
          <p>We use the following third-party services to operate the platform, each of whom may process your personal data:</p>
          <ul>
            <li><strong>Supabase</strong> — database hosting and authentication (servers in AWS ap-southeast-2, Sydney, Australia).</li>
            <li><strong>Stripe</strong> — payment processing (United States). Card data is handled exclusively by Stripe and is never stored by ListHQ.</li>
            <li><strong>Google Maps Platform</strong> — property location display and address autocomplete (United States). Google Maps usage data is collected per Google's privacy policy. You can opt out of Google Maps via our consent mechanism.</li>
            <li><strong>Firecrawl</strong> — web scraping of publicly available property listings for import. No personal data is transmitted to Firecrawl.</li>
            <li><strong>OpenAI</strong> — AI text generation for offer letters and buyer matching. Only anonymised, non-identifying queries are sent to OpenAI.</li>
            <li><strong>Resend</strong> — transactional email delivery.</li>
          </ul>
          <p>
            Each provider operates under their own privacy policy and data processing agreements.
            Cross-border transfers are conducted in accordance with APP 8 of the <em>Privacy Act 1988</em> (Cth).
          </p>

          <h2>7. Data Retention</h2>
          <ul>
            <li><strong>Tenancy records:</strong> 7 years from creation (Australian legal requirement).</li>
            <li><strong>Seeker profiles:</strong> 2 years from last activity, then anonymised.</li>
            <li><strong>Voice search transcripts:</strong> 90 days.</li>
            <li><strong>Payment and billing records:</strong> 7 years (taxation compliance).</li>
            <li><strong>Agent profiles:</strong> retained while the account is active; anonymised on deletion (subject to legal retention requirements).</li>
          </ul>

          <h2>8. Data Storage &amp; Security</h2>
          <p>
            Your data is stored on secure servers located in Australia (AWS ap-southeast-2, Sydney) with
            encryption at rest and in transit. While we take reasonable steps to protect your information,
            no method of electronic storage is 100% secure.
          </p>

          <h2>9. Cookies, Google Maps &amp; Tracking</h2>
          <p>
            We use cookies and similar technologies to enhance your experience, remember preferences, and
            analyse platform usage. Google Maps is used for property location features and requires your
            explicit consent before loading.
          </p>
          <p>
            You can manage cookie preferences through your browser settings.{' '}
            <button
              onClick={resetConsent}
              className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
            >
              Reset cookie &amp; Maps preferences
            </button>
          </p>

          <h2>10. Your Rights</h2>
          <p>Under Australian privacy law (and GDPR for international users), you have the right to:</p>
          <ul>
            <li>Access personal information we hold about you.</li>
            <li>Request correction of inaccurate or outdated information.</li>
            <li>Request deletion of your account and associated data (subject to legal retention requirements — e.g. tenancy records must be retained for 7 years).</li>
            <li>Opt out of marketing communications at any time.</li>
            <li>Know what data is collected and why.</li>
            <li>Withdraw consent for Google Maps and other optional services at any time.</li>
          </ul>
          <p>To exercise any of these rights, contact <a href="mailto:privacy@listhq.com.au" className="text-primary hover:underline">privacy@listhq.com.au</a>.</p>

          <h2>11. International Data Transfers</h2>
          <p>
            As a global platform, some data may be processed in jurisdictions outside Australia (principally the
            United States for payment processing and AI services). We ensure appropriate safeguards are in place
            in accordance with APP 8 (cross-border disclosure).
          </p>

          <h2>12. Data Breach Notification</h2>
          <p>
            In the event of an eligible data breach under the Notifiable Data Breaches (NDB) scheme, ListHQ will
            notify the Office of the Australian Information Commissioner (OAIC) and affected individuals within
            the timeframes required by law.
          </p>

          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be communicated via email or
            an in-app notification.
          </p>

          <h2>14. Contact &amp; Complaints</h2>
          <p>
            For privacy enquiries or complaints, contact our Privacy Officer at{' '}
            <a href="mailto:privacy@listhq.com.au" className="text-primary hover:underline">
              privacy@listhq.com.au
            </a>.
            If you are not satisfied with our response, you may lodge a complaint with the{' '}
            <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Office of the Australian Information Commissioner
            </a>.
          </p>
        </article>
      </main>
    </>
  );
};

export default PrivacyPage;
