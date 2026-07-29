import { GatedPlaceholder } from '@/components/gated-placeholder';

export default function WalletsPage() {
  return (
    <GatedPlaceholder
      title="Wallets"
      description="Browse wallets, balances, and transaction history."
      permission="transaction.view_all"
    />
  );
}
