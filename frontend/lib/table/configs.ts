import type { TableConfig } from './params';

// Table configs live in a PLAIN module (no 'use client'): Server Components parse the URL with them
// and client components read them too. Exporting a value from a client module and importing it in
// a Server Component hands you a client-reference stub, not the object — learned the hard way.
export const WALLETS_TABLE: TableConfig = { sortFields: ['balance', 'createdAt', 'name'], defaultSort: 'createdAt:asc', filterKeys: ['currency'] };
export const USERS_TABLE: TableConfig = { sortFields: ['createdAt', 'email', 'status'], defaultSort: 'createdAt:desc', filterKeys: ['role', 'status'] };
// Audit has no sort (always newest first); filters + free text + date range.
export const AUDIT_TABLE: TableConfig = { sortFields: [], defaultSort: 'createdAt:desc', filterKeys: ['entityType', 'action', 'actorId', 'from', 'to'] };
