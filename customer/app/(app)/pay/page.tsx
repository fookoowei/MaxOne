import Link from 'next/link';
import { Send, QrCode, ScanLine, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

const actions = [
  { href: '/pay/send', label: 'Send', hint: 'To anyone by their handle', icon: Send },
  { href: '/pay/receive', label: 'Receive', hint: 'Show your QR code', icon: QrCode },
  { href: '/pay/scan', label: 'Scan to pay', hint: 'Point your camera at a code', icon: ScanLine },
];

export default function PayPage() {
  return (
    <div className="space-y-6 lg:max-w-[720px]">
      <PageHeader title="Pay" description="Send, receive or scan — transfers land instantly." />
      <div className="grid gap-3">
        {actions.map(({ href, label, hint, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-16 items-center gap-4 rounded-2xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block">{label}</span>
              <span className="block text-xs font-normal text-muted-foreground">{hint}</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
