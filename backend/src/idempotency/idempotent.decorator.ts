import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';

export const IDEMPOTENCY_META = 'idempotency';
export interface IdempotentOptions {
  required: boolean; // true → a missing Idempotency-Key is a 400; false → only enforced when sent
}

// Mark a money-mutating route idempotent: one decorator = the metadata + the interceptor.
export const Idempotent = (opts: IdempotentOptions = { required: true }) =>
  applyDecorators(SetMetadata(IDEMPOTENCY_META, opts), UseInterceptors(IdempotencyInterceptor));
