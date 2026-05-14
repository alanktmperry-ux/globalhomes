import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OutreachPage from '@/features/admin/pages/OutreachPage';
import AdminCommsStatsPage from '@/features/admin/pages/AdminCommsStatsPage';

export default function OutreachShell() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'send';
  const setTab = (v: string) => setParams({ tab: v });

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="send" className="mt-4"><OutreachPage /></TabsContent>
        <TabsContent value="stats" className="mt-4"><AdminCommsStatsPage /></TabsContent>
      </Tabs>
    </div>
  );
}
