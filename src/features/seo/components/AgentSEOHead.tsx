import { Helmet } from 'react-helmet-async';

const APP_URL = 'https://listhq.com.au';

export function AgentSEOHead({ agent, listingCount = 0 }: { agent: any; listingCount?: number }) {
  const name = agent.name || agent.full_name || 'Agent';
  const agency = agent.agency || agent.agency_name || '';
  const title = `${name}${agency ? ' · ' + agency : ''} | Real Estate Agent${agent.suburb ? ' ' + agent.suburb : ''} | ListHQ`;
  const description = agent.bio?.slice(0, 160) ?? `${name} is a real estate agent${agent.suburb ? ' in ' + agent.suburb : ''}${agent.state ? ', ' + agent.state : ''}. View ${listingCount} active listing${listingCount !== 1 ? 's' : ''} on ListHQ.`;
  const url = `${APP_URL}/agent/${agent.slug ?? agent.id}`;
  const avatar = agent.avatar_url || agent.avatarUrl;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name,
    description,
    url,
    image: avatar,
    ...(agency ? { worksFor: { '@type': 'Organization', name: agency } } : {}),
    ...(agent.officeAddress || agent.office_address ? {
      address: {
        '@type': 'PostalAddress',
        streetAddress: agent.officeAddress || agent.office_address,
        addressCountry: 'AU',
      }
    } : {}),
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="profile" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {avatar && <meta property="og:image" content={avatar} />}
      <meta property="og:site_name" content="ListHQ" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
