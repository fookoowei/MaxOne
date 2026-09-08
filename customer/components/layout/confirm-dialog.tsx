'use client';

import type { ReactNode } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// One confirm for every destructive action: says what will happen in plain words; the action
// happens only on confirm; the confirm button names the action.
export function ConfirmDialog({ open, onOpenChange, title, description, actionLabel, destructive = true, pending, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description: ReactNode; actionLabel: string; destructive?: boolean; pending: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant={destructive ? 'destructive' : 'default'} pending={pending} onClick={onConfirm}>
            {actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
