import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toErrorBody } from './http-error';

const now = new Date('2026-09-04T10:00:00.000Z');
const body = (e: unknown) => toErrorBody(e, '/wallets/w1', now);

describe('toErrorBody', () => {
  it('maps a plain NotFoundException to 404 NOT_FOUND with the uniform envelope', () => {
    expect(body(new NotFoundException('Wallet not found'))).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Wallet not found',
      path: '/wallets/w1',
      timestamp: '2026-09-04T10:00:00.000Z',
    });
  });

  it('derives the code from the status for the other Nest exceptions', () => {
    expect(body(new UnauthorizedException()).code).toBe('UNAUTHORIZED');
    expect(body(new ForbiddenException()).code).toBe('FORBIDDEN');
    expect(body(new ConflictException('dup')).code).toBe('CONFLICT');
    expect(body(new BadRequestException('bad')).code).toBe('BAD_REQUEST');
  });

  it('keeps an explicit code from an object response (STEP_UP_REQUIRED survives)', () => {
    const e = new ForbiddenException({ code: 'STEP_UP_REQUIRED', message: 'Re-verify your authenticator' });
    expect(body(e)).toMatchObject({ statusCode: 403, code: 'STEP_UP_REQUIRED', message: 'Re-verify your authenticator' });
  });

  it('turns a ValidationPipe message array into VALIDATION_FAILED + details', () => {
    const e = new BadRequestException(['email must be an email', 'password too short']);
    expect(body(e)).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'email must be an email; password too short',
      details: ['email must be an email', 'password too short'],
    });
  });

  it('maps Prisma P2025 (record not found) to 404 and P2002 (unique) to 409', () => {
    const p2025 = new Prisma.PrismaClientKnownRequestError('no row', { code: 'P2025', clientVersion: 'test' });
    const p2002 = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' });
    expect(body(p2025)).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(body(p2002)).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('hides everything about an unknown error behind a generic 500', () => {
    const out = body(new Error('ECONNREFUSED postgres://wallet:wallet@db'));
    expect(out).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      path: '/wallets/w1',
      timestamp: '2026-09-04T10:00:00.000Z',
    });
    expect(JSON.stringify(out)).not.toContain('postgres');
  });
});
