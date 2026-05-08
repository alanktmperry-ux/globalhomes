import { Helmet } from 'react-helmet-async';
import { TeamCommunicationsDashboard } from '@/features/crm/components/TeamCommunicationsDashboard';

export default function AdminCommsStatsPage() {
  return (
    <>
      <Helmet>
        <title>Team Communications — ListHQ Admin</title>
      </Helmet>
      <div className="p-6 max-w-7xl mx-auto">
        <TeamCommunicationsDashboard />
      </div>
    </>
  );
}
