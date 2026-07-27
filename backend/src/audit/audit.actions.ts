/**
 * The closed set of audited actions. A union rather than free-form strings, so a typo is a
 * compile error and every audited action in the system is discoverable in one file.
 */
export type AuditAction =
  | 'deposit.approve'
  | 'deposit.reject'
  | 'withdrawal.approve'
  | 'withdrawal.reject'
  | 'wallet.adjust'
  | 'wallet.transfer'
  | 'user.status_change'
  | 'user.role_change';

export type AuditEntityType = 'transaction' | 'wallet' | 'user';
