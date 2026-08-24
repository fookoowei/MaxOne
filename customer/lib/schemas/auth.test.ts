import { describe, it, expect } from 'vitest';
import { signupSchema, loginSchema } from './auth';

describe('signupSchema', () => {
  const valid = {
    email: 'alice@example.com',
    handle: 'alice',
    password: 'Password123',
    firstName: 'Alice',
    lastName: 'Lee',
  };

  it('accepts a valid sign-up', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a bad email', () => {
    expect(signupSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });

  it('rejects a password shorter than 8 chars', () => {
    expect(signupSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('rejects an empty first name', () => {
    expect(signupSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'Password123' }).success).toBe(true);
  });

  it('rejects a missing password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});
