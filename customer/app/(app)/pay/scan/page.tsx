import { PageHeader } from '@/components/layout/page-header';
import { QrScanner } from '@/components/pay/qr-scanner';

export default function ScanPage() {
  return (
    <div className="space-y-6 lg:max-w-[560px]">
      <PageHeader title="Scan to pay" description="Point your camera at a MaxOne code." back={{ href: '/pay', label: 'Pay' }} />
      <QrScanner />
    </div>
  );
}
