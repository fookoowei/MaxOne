import type { ReactNode } from 'react';

// The content column: full width on phone/tablet, capped at 720px and LEFT-aligned on desktop
// (never stretched edge to edge on a wide monitor). `aside` appears only ≥1280px, beside it.
export function WithAside({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="xl:flex xl:items-start xl:gap-10">
      <div className="min-w-0 flex-1 lg:max-w-[720px]">{children}</div>
      {aside && <aside className="hidden w-[360px] shrink-0 space-y-5 xl:block">{aside}</aside>}
    </div>
  );
}
