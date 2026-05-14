import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { SiteHeader } from '@/shared/components/layout/SiteHeader';
import { SiteFooter } from '@/shared/components/layout/SiteFooter';
import { CareersHero } from '@/features/careers/components/CareersHero';
import { FounderPitch } from '@/features/careers/components/FounderPitch';
import { WhyListHQ } from '@/features/careers/components/WhyListHQ';
import { RoleCard } from '@/features/careers/components/RoleCard';
import { CareersApplicationForm } from '@/features/careers/components/CareersApplicationForm';
import { CAREERS_ROLES, type CareersRole } from '@/features/careers/data/roles';

export default function CareersPage() {
  const [selectedRole, setSelectedRole] = useState<CareersRole['id'] | ''>('');

  function handleApply(roleId: CareersRole['id']) {
    setSelectedRole(roleId);
    requestAnimationFrame(() => {
      document.getElementById('careers-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <>
      <Helmet>
        <title>Careers — Build the future of Australian real estate | ListHQ</title>
        <meta
          name="description"
          content="Join ListHQ as a founding-team hire. 5 open roles: engineering, design, growth, sales, customer success. Founder equity, premium product, multicultural-first."
        />
        <link rel="canonical" href="https://listhq.com.au/careers" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'ListHQ',
          url: 'https://listhq.com.au',
          email: 'careers@listhq.com.au',
        })}</script>
      </Helmet>

      <SiteHeader />

      <main className="bg-background">
        <CareersHero />
        <FounderPitch />
        <WhyListHQ />

        <section className="px-4 sm:px-6 py-12 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-light text-center text-foreground mb-2">Open roles</h2>
          <p className="text-center text-muted-foreground font-light mb-10">5 founding-team seats. Plus exceptional people, always.</p>
          <div className="space-y-4">
            {CAREERS_ROLES.map((role) => (
              <RoleCard key={role.id} role={role} onApply={handleApply} />
            ))}
          </div>
        </section>

        <section id="careers-apply" className="px-4 sm:px-6 py-12 pb-20 max-w-3xl mx-auto scroll-mt-24">
          <CareersApplicationForm selectedRole={selectedRole} onRoleChange={setSelectedRole} />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
