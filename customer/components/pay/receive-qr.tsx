'use client';

import { QRCodeSVG } from 'qrcode.react';
import { encodeQr } from '@/lib/qr/payload';

export function ReceiveQr({ handle }: { handle: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl bg-white p-4">
        <QRCodeSVG value={encodeQr(handle)} size={200} />
      </div>
      <p className="text-lg font-semibold">@{handle}</p>
      <p className="text-sm text-muted-foreground">Scan to pay me on MaxOne</p>
    </div>
  );
}
