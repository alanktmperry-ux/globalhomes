import { useSearchParams } from 'react-router-dom';
import AgentLifecycle from '@/features/admin/components/AgentLifecycle';

export default function AgentsPage() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Agents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lifecycle, adoption scores, and CRM for every agent on the platform.
        </p>
      </div>
      <AgentLifecycle filter={filter} />
    </div>
  );
}
