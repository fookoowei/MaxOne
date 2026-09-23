'use client';

import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// The reference's closing beat: a check that pops in, one line of confirmation, one way out.
// Every dismissal (button, backdrop, Escape) goes home — there is nothing else to do here.
export function ExchangeSuccessDialog({ open, summary, onHome }: { open: boolean; summary: string; onHome: () => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onHome();
      }}
    >
      <DialogContent showCloseButton={false} className="gap-5 rounded-[28px] p-6 text-center sm:max-w-xs">
        <div className="pop-in mx-auto flex size-[76px] items-center justify-center rounded-full bg-primary/10">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-7" strokeWidth={3} aria-hidden />
          </div>
        </div>
        <DialogHeader className="items-center gap-2 text-center">
          <DialogTitle className="text-xl font-bold tracking-tight">Exchange completed</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{summary} Your balances are already up to date.</DialogDescription>
        </DialogHeader>
        <Button size="xl" className="h-13 w-full rounded-[18px] text-base" onClick={onHome}>
          Go home
        </Button>
      </DialogContent>
    </Dialog>
  );
}
