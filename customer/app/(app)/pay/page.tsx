import Link from 'next/link';
import { Send, QrCode, ScanLine } from 'lucide-react';

const actions = [
  { href: '/pay/send', label: 'Send', icon: Send },
  { href: '/pay/receive', label: 'Receive', icon: QrCode },
  { href: '/pay/scan', label: 'Scan to pay', icon: ScanLine },
];

export default function PayPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Pay</h1>
      <div className="grid gap-3">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium"
          >
            <Icon className="size-5 text-primary" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
