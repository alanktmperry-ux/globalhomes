import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface UpgradeGateProps {
  requiredPlan: string;
  message: string;
}

const UpgradeGate = ({ requiredPlan, message }: UpgradeGateProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Lock size={22} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold">Requires {requiredPlan}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        <Button onClick={() => navigate('/dashboard/billing')}>View Plans</Button>
      </div>
    </div>
  );
};

export default UpgradeGate;
