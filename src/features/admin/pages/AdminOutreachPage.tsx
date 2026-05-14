import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CommsCentre from '@/features/admin/components/CommsCentre';
import PressOutreachPage from '@/features/admin/components/PressOutreachPage';
import ReferralPartnerManager from '@/features/admin/components/ReferralPartnerManager';

export default function AdminOutreachPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Outreach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comms campaigns, press contacts, and referral partner management.
        </p>
      </div>
      <Tabs defaultValue="comms" className="w-full">
        <TabsList>
          <TabsTrigger value="comms">Comms</TabsTrigger>
          <TabsTrigger value="press">Press</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
        </TabsList>
        <TabsContent value="comms" className="mt-4">
          <CommsCentre />
        </TabsContent>
        <TabsContent value="press" className="mt-4">
          <PressOutreachPage />
        </TabsContent>
        <TabsContent value="partners" className="mt-4">
          <ReferralPartnerManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
