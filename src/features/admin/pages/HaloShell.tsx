import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HaloCreditsPage from '@/features/admin/pages/HaloCreditsPage';
import HaloHealthPage from '@/features/admin/pages/HaloHealthPage';
import HaloAnalyticsPage from '@/features/admin/pages/HaloAnalyticsPage';

export default function HaloShell() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'credits';
  const setTab = (v: string) => setParams({ tab: v });

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Halo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The reverse marketplace — buyer briefs, agent credits, fulfilment health.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="credits" className="mt-4"><HaloCreditsPage /></TabsContent>
        <TabsContent value="health" className="mt-4"><HaloHealthPage /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><HaloAnalyticsPage /></TabsContent>
      </Tabs>
    </div>
  );
}
