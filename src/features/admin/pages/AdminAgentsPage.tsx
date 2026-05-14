import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgentLifecycle from '@/features/admin/components/AgentLifecycle';
import AgentApprovalQueue from '@/features/admin/components/AgentApprovalQueue';
import AgentSubscriptionAdmin from '@/features/admin/components/AgentSubscriptionAdmin';

export default function AdminAgentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approval queue, lifecycle stages, and subscription administration.
        </p>
      </div>
      <Tabs defaultValue="lifecycle" className="w-full">
        <TabsList>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="approvals">Approval queue</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="lifecycle" className="mt-4">
          <AgentLifecycle />
        </TabsContent>
        <TabsContent value="approvals" className="mt-4">
          <AgentApprovalQueue />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <AgentSubscriptionAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
