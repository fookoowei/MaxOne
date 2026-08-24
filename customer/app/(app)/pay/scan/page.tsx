import Link from 'next/link';
import { QrScanner } from '@/components/qr-scanner';

export default function ScanPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link href="/pay" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Scan to pay</h1>
      </header>
      <QrScanner />
    </div>
  );
}
