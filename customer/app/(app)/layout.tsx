import { Toaster } from 'sonner';
import { BottomNav } from '@/components/bottom-nav';
import { NotificationToaster } from '@/components/notification-toaster';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[420px] px-5 pb-24 pt-8">
      {children}
      <BottomNav />
      <Toaster position="top-center" />
      <NotificationToaster />
    </div>
  );
}
