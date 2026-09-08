'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MoneyText } from '@/components/money-text';

export interface DecisionSubject {
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  walletName: string;
  ownerEmail: string;
}

// Money decisions get a dialog that says exactly what will happen, in the user's words, and a
// button that names the action. The API call happens only on confirm (the caller's `onConfirm`).
export function ApproveDialog({ open, onOpenChange, subject, onConfirm, pending }: { open: boolean; onOpenChange: (o: boolean) => void; subject: DecisionSubject; onConfirm: () => Promise<void>; pending: boolean }) {
  const verb = subject.type === 'deposit' ? 'Add' : 'Send';
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Approve {subject.type} of <MoneyText amountMinor={subject.amount} currency={subject.currency} />?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {verb} <MoneyText amountMinor={subject.amount} currency={subject.currency} className="text-foreground" /> {subject.type === 'deposit' ? 'to' : 'from'} <span className="text-foreground">{subject.walletName}</span> ({subject.ownerEmail}). This moves money and is recorded in the audit trail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button pending={pending} onClick={() => void onConfirm()}>
            Approve {subject.type}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RejectDialog({ open, onOpenChange, subject, onConfirm, pending }: { open: boolean; onOpenChange: (o: boolean) => void; subject: DecisionSubject; onConfirm: (note: string) => Promise<void>; pending: boolean }) {
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Reject {subject.type} of <MoneyText amountMinor={subject.amount} currency={subject.currency} />?
          </DialogTitle>
          <DialogDescription>
            {subject.ownerEmail} will be told their {subject.type} was declined. Nothing moves. A note helps them understand why.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reject-note">Note to the customer (optional)</Label>
          <textarea id="reject-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Source of funds could not be verified" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" pending={pending} onClick={() => void onConfirm(note.trim())}>
            Reject {subject.type}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
