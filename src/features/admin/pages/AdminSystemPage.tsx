import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminDatabase from '@/features/admin/components/AdminDatabase';
import AdminReports from '@/features/admin/components/AdminReports';
import ComplianceMonitor from '@/features/admin/components/ComplianceMonitor';
import PreLaunchChecklist from '@/features/admin/components/PreLaunchChecklist';

export default function AdminSystemPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Database, reports, compliance monitoring, and pre-launch checklist.
        </p>
      </div>
      <Tabs defaultValue="database" className="w-full">
        <TabsList>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="checklist">Pre-launch</TabsTrigger>
        </TabsList>
        <TabsContent value="database" className="mt-4">
          <AdminDatabase />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <AdminReports isAdmin />
        </TabsContent>
        <TabsContent value="compliance" className="mt-4">
          <ComplianceMonitor />
        </TabsContent>
        <TabsContent value="checklist" className="mt-4">
          <PreLaunchChecklist />
        </TabsContent>
      </Tabs>
    </div>
  );
}
