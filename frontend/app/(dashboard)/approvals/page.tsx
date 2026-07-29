import { GatedPlaceholder } from '@/components/gated-placeholder';

export default function ApprovalsPage() {
  return (
    <GatedPlaceholder
      title="Approvals"
      description="Review and approve pending deposits and withdrawals."
      permission="deposit.approve"
    />
  );
}
