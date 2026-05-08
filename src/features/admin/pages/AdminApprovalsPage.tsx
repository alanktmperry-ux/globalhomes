import AgentApprovalQueue from '@/features/admin/components/AgentApprovalQueue';

export default function AdminApprovalsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="text-sm text-muted-foreground">Review and approve pending agent registrations.</p>
      </div>
      <AgentApprovalQueue />
    </div>
  );
}
