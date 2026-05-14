import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SystemPage from '@/features/admin/pages/SystemPage';
import WebhookDiagnosticPage from '@/features/admin/pages/WebhookDiagnosticPage';
import AdminHelpPage from '@/features/admin/pages/AdminHelpPage';

export default function SystemShell() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'health';
  const setTab = (v: string) => setParams({ tab: v });

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>
        <TabsContent value="health" className="mt-4"><SystemPage /></TabsContent>
        <TabsContent value="webhooks" className="mt-4"><WebhookDiagnosticPage /></TabsContent>
        <TabsContent value="help" className="mt-4"><AdminHelpPage /></TabsContent>
      </Tabs>
    </div>
  );
}
