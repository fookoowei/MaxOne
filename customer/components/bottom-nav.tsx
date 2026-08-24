import { Home, Send, CreditCard, User } from 'lucide-react';

const tabs = [
  { label: 'Home', icon: Home, active: true },
  { label: 'Pay', icon: Send, active: false },
  { label: 'Cards', icon: CreditCard, active: false },
  { label: 'Profile', icon: User, active: false },
];

// Bottom tab bar. Only Home is wired for the foundation; Pay/Cards/Profile are
// visible-but-disabled placeholders for later slices (M11b–d).
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-[420px] border-t bg-card/90 backdrop-blur">
      {tabs.map(({ label, icon: Icon, active }) => (
        <div
          key={label}
          aria-current={active ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
            active ? 'text-primary' : 'text-muted-foreground/50'
          }`}
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </div>
      ))}
    </nav>
  );
}
