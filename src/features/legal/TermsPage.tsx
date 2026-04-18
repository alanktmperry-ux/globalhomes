import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const sections = [
  { id: 'about', title: '1. About ListHQ' },
  { id: 'acceptance', title: '2. Acceptance of Terms' },
  { id: 'accounts', title: '3. User Accounts' },
  { id: 'agents', title: '4. Agent Obligations' },
  { id: 'buyers', title: '5. Buyer and Renter Obligations' },
  { id: 'ip', title: '6. Intellectual Property' },
  { id: 'referrals', title: '7. International Referral Program' },
  { id: 'pm', title: '8. Property Management Features' },
  { id: 'liability', title: '9. Limitation of Liability' },
  { id: 'privacy', title: '10. Privacy' },
  { id: 'law', title: '11. Governing Law' },
  { id: 'changes', title: '12. Changes to Terms' },
  { id: 'contact', title: '13. Contact' },
];

const TermsPage = () => {
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms of Service</title>
        <meta name="description" content="Terms of Service for ListHQ — Australian real estate platform connecting agents, buyers, renters, vendors and property managers." />
      </Helmet>
      <main className="bg-background">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16">
          <h1 className="font-display text-3xl font-extrabold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-6">Last updated: April 2026</p>

          <div className="mb-8 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            These terms are interim and under active legal review. By using this platform you agree to be bound by these terms as updated. Last updated April 2026.
          </div>

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
            <section id="about">
              <h2>1. About ListHQ</h2>
              <p>ListHQ is an Australian real estate platform connecting agents, buyers, renters, vendors and property managers. Operated by ListHQ Pty Ltd, Australia.</p>
            </section>

            <section id="acceptance">
              <h2>2. Acceptance of Terms</h2>
              <p>By accessing or using ListHQ, you agree to these terms. If you do not agree, do not use the platform.</p>
            </section>

            <section id="accounts">
              <h2>3. User Accounts</h2>
              <ul>
                <li>Agents must provide accurate registration information.</li>
                <li>You are responsible for maintaining account security.</li>
                <li>ListHQ reserves the right to suspend accounts that breach these terms.</li>
                <li>One account per person/agency unless otherwise agreed.</li>
              </ul>
            </section>

            <section id="agents">
              <h2>4. Agent Obligations</h2>
              <ul>
                <li>Listings must be accurate and not misleading.</li>
                <li>Agents must hold a valid real estate licence in their operating state.</li>
                <li>Commission and fee structures must comply with applicable state legislation.</li>
                <li>Agents are responsible for FIRB compliance advice — ListHQ calculators are indicative only.</li>
              </ul>
            </section>

            <section id="buyers">
              <h2>5. Buyer and Renter Obligations</h2>
              <ul>
                <li>Users must not submit false enquiries or applications.</li>
                <li>Foreign buyers are solely responsible for obtaining FIRB approval where required.</li>
                <li>ListHQ is not a licensed financial adviser — all calculators are estimates only.</li>
              </ul>
            </section>

            <section id="ip">
              <h2>6. Intellectual Property</h2>
              <ul>
                <li>All platform content, design and code is owned by ListHQ Pty Ltd.</li>
                <li>Agents retain ownership of their listing content and photos.</li>
                <li>By uploading content, agents grant ListHQ a licence to display it on the platform.</li>
              </ul>
            </section>

            <section id="referrals">
              <h2>7. International Referral Program</h2>
              <ul>
                <li>Referral commissions are paid on settled transactions only.</li>
                <li>Commission amounts are as displayed in the referral program tier schedule.</li>
                <li>ListHQ reserves the right to modify commission rates with 30 days notice.</li>
                <li>Referrals must be genuine — fraudulent referrals will result in account termination.</li>
              </ul>
            </section>

            <section id="pm">
              <h2>8. Property Management Features</h2>
              <ul>
                <li>PM tools including trust accounting, rent roll and tenant portals are provided as software only.</li>
                <li>Agents using trust accounting features must comply with their state's trust accounting legislation.</li>
                <li>ListHQ is not responsible for errors in trust accounting records — agents must maintain independent records.</li>
                <li>Tenant and owner portal access is the agent's responsibility to manage.</li>
              </ul>
            </section>

            <section id="liability">
              <h2>9. Limitation of Liability</h2>
              <ul>
                <li>ListHQ provides the platform "as is" without warranty.</li>
                <li>To the maximum extent permitted by Australian law, ListHQ's liability is limited to the subscription fees paid in the prior 3 months.</li>
                <li>ListHQ is not liable for losses arising from reliance on property valuations, stamp duty estimates, or FIRB fee calculations.</li>
              </ul>
            </section>

            <section id="privacy">
              <h2>10. Privacy</h2>
              <p>Your use of ListHQ is also governed by our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.</p>
            </section>

            <section id="law">
              <h2>11. Governing Law</h2>
              <p>These terms are governed by the laws of Victoria, Australia. Disputes are subject to the exclusive jurisdiction of Victorian courts.</p>
            </section>

            <section id="changes">
              <h2>12. Changes to Terms</h2>
              <p>ListHQ may update these terms at any time. Continued use after notice of changes constitutes acceptance.</p>
            </section>

            <section id="contact">
              <h2>13. Contact</h2>
              <p>Legal enquiries: <a href="mailto:legal@listhq.com.au" className="text-primary hover:underline">legal@listhq.com.au</a></p>
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

export default TermsPage;
