'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import Link from 'next/link';
import { parseQr } from '@/lib/qr/payload';

export function QrScanner() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const scanner = new Html5Qrcode(ref.current.id);
    let stopped = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (text) => {
          const handle = parseQr(text);
          if (handle && !stopped) {
            stopped = true;
            scanner.stop().finally(() => router.push(`/pay/send?handle=${handle}`));
          }
        },
        () => {},
      )
      .catch(() => setError('Camera unavailable. You can type a handle instead.'));

    return () => {
      if (!stopped) scanner.stop().catch(() => {});
    };
  }, [router]);

  return (
    <div className="space-y-4">
      <div id="qr-reader" ref={ref} className="overflow-hidden rounded-2xl" />
      {error && (
        <p className="text-sm text-destructive">
          {error}{' '}
          <Link href="/pay/send" className="underline">
            Send by handle
          </Link>
        </p>
      )}
    </div>
  );
}
