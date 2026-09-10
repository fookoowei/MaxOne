/**
 * The closed set of audited actions. A union rather than free-form strings, so a typo is a
 * compile error and every audited action in the system is discoverable in one file.
 */
export type AuditAction =
  | 'deposit.settle' // customer-initiated, settles instantly (2026-09-10)
  | 'deposit.approve' // legacy: rows that were still pending when review was removed
  | 'deposit.reject'
  | 'withdrawal.approve'
  | 'withdrawal.reject'
  | 'wallet.adjust'
  | 'wallet.transfer'
  | 'user.status_change'
  | 'user.role_change';

export type AuditEntityType = 'transaction' | 'wallet' | 'user';
