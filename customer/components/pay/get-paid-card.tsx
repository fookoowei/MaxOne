import { CardLink } from '@/components/layout/card-link';
import { ReceiveQr } from '@/components/pay/receive-qr';

// Desktop aside on Pay: be paid without leaving the page — the same QR the Receive screen shows.
export function GetPaidCard({ handle }: { handle: string }) {
  return (
    <section className="rounded-[20px] border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Get paid</h2>
        <CardLink href="/pay/receive">Open</CardLink>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Anyone can scan this to pay you.</p>
      <div className="mt-4">
        <ReceiveQr handle={handle} size={160} />
      </div>
    </section>
  );
}
