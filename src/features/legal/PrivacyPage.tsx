import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const sections = [
  { id: 'introduction', title: '1. Introduction' },
  { id: 'collect', title: '2. What Information We Collect' },
  { id: 'use', title: '3. How We Use Your Information' },
  { id: 'transfers', title: '4. International Data Transfers' },
  { id: 'retention', title: '5. Data Retention' },
  { id: 'rights', title: '6. Your Rights' },
  { id: 'cookies', title: '7. Cookies' },
  { id: 'security', title: '8. Security' },
  { id: 'children', title: '9. Children' },
  { id: 'changes', title: '10. Changes to This Policy' },
  { id: 'contact', title: '11. Contact & Complaints' },
];

const PrivacyPage = () => {
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy</title>
        <meta name="description" content="Privacy Policy for ListHQ — how we collect, use and protect your personal information under the Australian Privacy Act and GDPR." />
      </Helmet>
      <main className="bg-background">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16">
          <h1 className="font-display text-3xl font-extrabold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-6">Last updated: April 2026</p>

          <nav className="bg-muted/40 border border-border rounded-lg p-4 mb-10">
            <p className="text-sm font-semibold text-foreground mb-3">Contents</p>
            <ul className="space-y-1.5">
              {sections.map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-sm text-primary hover:underline">{s.title}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="prose prose-neutral max-w-none">
            <section id="introduction">
              <h2>1. Introduction</h2>
              <p>ListHQ Pty Ltd is committed to protecting your privacy in accordance with the Australian <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs). This policy also addresses obligations under the GDPR for users in the European Union and equivalent international privacy laws.</p>
            </section>

            <section id="collect">
              <h2>2. What Information We Collect</h2>
              <p>Personal information collected includes:</p>
              <ul>
                <li><strong>Agents:</strong> name, email, phone, agency name, ABN, licence number, profile photo.</li>
                <li><strong>Buyers/Renters:</strong> name, email, phone, search preferences, saved listings.</li>
                <li><strong>Tenants:</strong> name, email, phone, tenancy details, payment history (stored by agent, accessed via tenant portal).</li>
                <li><strong>Owners/Landlords:</strong> name, email, phone, property and financial information.</li>
                <li><strong>Referral agents:</strong> name, email, country, WeChat ID, referral activity.</li>
                <li><strong>Suppliers/Tradespeople:</strong> business name, ABN, licence, insurance details.</li>
                <li><strong>All users:</strong> IP address, browser language, device type, usage data.</li>
              </ul>
            </section>

            <section id="use">
              <h2>3. How We Use Your Information</h2>
              <ul>
                <li>To provide and improve the ListHQ platform.</li>
                <li>To send transactional emails (rent receipts, inspection notices, arrears reminders, portal access links).</li>
                <li>To process subscription payments via Stripe — Stripe's privacy policy applies to payment data.</li>
                <li>To generate property translations via AI services.</li>
                <li>To display property listings to prospective buyers and renters.</li>
                <li>To send referral commission notifications.</li>
              </ul>
            </section>

            <section id="transfers">
              <h2>4. International Data Transfers</h2>
              <p>ListHQ serves users globally. Your data may be processed by:</p>
              <ul>
                <li>Supabase (database and authentication) — servers in Australia and USA.</li>
                <li>Resend (transactional email) — USA.</li>
                <li>Stripe (payments) — USA.</li>
                <li>Google (QR code generation, maps) — USA.</li>
              </ul>
              <p>Data transfers comply with applicable international transfer mechanisms.</p>
            </section>

            <section id="retention">
              <h2>5. Data Retention</h2>
              <ul>
                <li>Active account data: retained while account is active.</li>
                <li>Tenancy records: retained for 7 years (Australian tax record requirements).</li>
                <li>Deleted accounts: personal data removed within 30 days, financial records retained as required by law.</li>
              </ul>
            </section>

            <section id="rights">
              <h2>6. Your Rights</h2>
              <p>Australian users have the right to:</p>
              <ul>
                <li>Access personal information we hold about you.</li>
                <li>Correct inaccurate information.</li>
                <li>Request deletion of your data (subject to legal retention requirements).</li>
              </ul>
              <p>EU/UK users additionally have rights under GDPR including data portability and the right to object to processing.</p>
              <p>To exercise these rights: <a href="mailto:privacy@listhq.com.au" className="text-primary hover:underline">privacy@listhq.com.au</a></p>
            </section>

            <section id="cookies">
              <h2>7. Cookies</h2>
              <p>We use cookies and similar technologies to keep you signed in, remember your language and currency preferences, and understand how the platform is used. You can manage your choice at any time using the "Cookie Preferences" link in the site footer.</p>
              <ul>
                <li><strong>Essential cookies:</strong> required for sign-in, security and portal access.</li>
                <li><strong>Preference cookies:</strong> store your language, currency and saved listings.</li>
                <li><strong>Analytics cookies:</strong> help us measure site usage and improve features.</li>
              </ul>
            </section>

            <section id="security">
              <h2>8. Security</h2>
              <p>We use industry-standard security including encrypted connections (HTTPS), row-level security on all database tables, and token-based portal access. We do not store credit card numbers — all payment processing is handled by Stripe.</p>
            </section>

            <section id="children">
              <h2>9. Children</h2>
              <p>ListHQ is not intended for users under 18. We do not knowingly collect data from minors.</p>
            </section>

            <section id="changes">
              <h2>10. Changes to This Policy</h2>
              <p>We will notify users of material changes via email or platform notification. Last updated: April 2026.</p>
            </section>

            <section id="contact">
              <h2>11. Contact &amp; Complaints</h2>
              <p>Privacy Officer: <a href="mailto:privacy@listhq.com.au" className="text-primary hover:underline">privacy@listhq.com.au</a></p>
              <p>If unsatisfied with our response, you may contact the Office of the Australian Information Commissioner (<a href="https://oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">oaic.gov.au</a>).</p>
            </section>
          </div>
        </article>

        {showTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-6 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            aria-label="Back to top"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </main>
    </>
  );
};

export default PrivacyPage;
