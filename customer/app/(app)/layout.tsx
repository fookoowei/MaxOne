import { BottomNav } from '@/components/bottom-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[420px] px-5 pb-24 pt-8">
      {children}
      <BottomNav />
    </div>
  );
}
