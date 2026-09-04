/**
 * Strip secrets before a user row ever leaves the API: the password hash AND the 2FA
 * material (TOTP secret + recovery-code hashes). A plain function, not a service method:
 * it has no dependencies, so DI would be ceremony — and as an import it stays real in
 * every test (a mocked method would make "returns no secret" a vacuous assertion).
 */
export function toSafeUser<
  T extends { passwordHash: string; totpSecret?: string | null; totpRecoveryHashes?: string[] },
>(user: T): Omit<T, 'passwordHash' | 'totpSecret' | 'totpRecoveryHashes'> {
  const {
    passwordHash: _passwordHash,
    totpSecret: _totpSecret,
    totpRecoveryHashes: _totpRecoveryHashes,
    ...safeUser
  } = user;
  return safeUser;
}
