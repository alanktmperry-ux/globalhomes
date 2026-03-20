import { Helmet } from 'react-helmet-async';

const PrivacyPage = () => (
  <>
    <Helmet>
      <title>Privacy Policy | Global Homes</title>
      <meta name="description" content="Privacy Policy for Global Homes — how we collect, use, and protect your personal information." />
    </Helmet>
    <main className="bg-background">
      <article className="max-w-3xl mx-auto px-4 py-16 prose prose-neutral dark:prose-invert">
        <h1 className="font-display text-3xl font-extrabold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: 18 March 2026</p>

        <h2>1. Overview</h2>
        <p>
          Global Homes Pty Ltd (ABN 00 000 000 000) is committed to protecting your personal information in
          accordance with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs).
          This policy explains how we collect, use, disclose, and safeguard your data.
        </p>

        <h2>2. Information We Collect</h2>
        <ul>
          <li><strong>Account data:</strong> name, email address, phone number, and profile photo.</li>
          <li><strong>Agent data:</strong> licence number, agency name, office address, and trust account details.</li>
          <li><strong>Search data:</strong> search queries, voice transcripts, saved searches, and location preferences.</li>
          <li><strong>Usage data:</strong> pages visited, features used, device type, IP address, and browser information.</li>
          <li><strong>Transaction data:</strong> property enquiries, lead details, and communication history.</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use personal information to:</p>
        <ul>
          <li>Provide and improve the platform and its features.</li>
          <li>Match buyers with relevant property listings.</li>
          <li>Facilitate communication between agents and buyers.</li>
          <li>Send service notifications and, with your consent, marketing communications.</li>
          <li>Comply with legal obligations and regulatory requirements.</li>
        </ul>

        <h2>4. Voice Search Data</h2>
        <p>
          Voice searches are transcribed and processed to match you with relevant listings. Transcripts may be
          shared with listing agents as part of lead qualification. You can delete your voice search history
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

        <h2>6. Data Storage & Security</h2>
        <p>
          Your data is stored on secure servers with encryption at rest and in transit. While we take
          reasonable steps to protect your information, no method of electronic storage is 100% secure.
        </p>

        <h2>7. Cookies & Tracking</h2>
        <p>
          We use cookies and similar technologies to enhance your experience, remember preferences, and
          analyse platform usage. You can manage cookie preferences through your browser settings.
        </p>

        <h2>8. Your Rights</h2>
        <p>Under Australian privacy law, you have the right to:</p>
        <ul>
          <li>Access personal information we hold about you.</li>
          <li>Request correction of inaccurate or outdated information.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>Opt out of marketing communications at any time.</li>
        </ul>

        <h2>9. International Data Transfers</h2>
        <p>
          As a global platform, some data may be processed in jurisdictions outside Australia. We ensure
          appropriate safeguards are in place in accordance with APP 8 (cross-border disclosure).
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be communicated via email or
          an in-app notification.
        </p>

        <h2>11. Contact & Complaints</h2>
        <p>
          For privacy enquiries or complaints, contact our Privacy Officer at{' '}
          <a href="mailto:privacy@globalhomes.com.au" className="text-primary hover:underline">
            privacy@globalhomes.com.au
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

export default PrivacyPage;
