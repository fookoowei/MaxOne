import { ForbiddenException } from '@nestjs/common';
import { StepUpGuard, STEP_UP_HEADER } from './step-up.guard';

function ctxFor(user: any, headers: Record<string, string> = {}) {
  return { switchToHttp: () => ({ getRequest: () => ({ user, headers }) }) } as any;
}
async function codeOf(p: Promise<unknown>) {
  try { await p; return null; } catch (e) { return (e as ForbiddenException).getResponse(); }
}

describe('StepUpGuard', () => {
  it('lets a user WITHOUT 2FA through untouched', async () => {
    const guard = new StepUpGuard({ verifyStepUpGrant: jest.fn() } as any);
    expect(await guard.canActivate(ctxFor({ id: 'u1', totpEnabled: false }))).toBe(true);
  });
  it('lets a 2FA user through with a valid grant for THEM', async () => {
    const guard = new StepUpGuard({ verifyStepUpGrant: jest.fn().mockResolvedValue('u1') } as any);
    expect(await guard.canActivate(ctxFor({ id: 'u1', totpEnabled: true }, { [STEP_UP_HEADER]: 'g' }))).toBe(true);
  });
  it('403 STEP_UP_REQUIRED when the grant is missing', async () => {
    const guard = new StepUpGuard({ verifyStepUpGrant: jest.fn() } as any);
    expect(await codeOf(guard.canActivate(ctxFor({ id: 'u1', totpEnabled: true })))).toMatchObject({ code: 'STEP_UP_REQUIRED' });
  });
  it('403 when the grant belongs to another user', async () => {
    const guard = new StepUpGuard({ verifyStepUpGrant: jest.fn().mockResolvedValue('u2') } as any);
    expect(await codeOf(guard.canActivate(ctxFor({ id: 'u1', totpEnabled: true }, { [STEP_UP_HEADER]: 'g' })))).toMatchObject({ code: 'STEP_UP_REQUIRED' });
  });
  it('403 when the grant is invalid/expired', async () => {
    const guard = new StepUpGuard({ verifyStepUpGrant: jest.fn().mockRejectedValue(new Error('x')) } as any);
    expect(await codeOf(guard.canActivate(ctxFor({ id: 'u1', totpEnabled: true }, { [STEP_UP_HEADER]: 'g' })))).toMatchObject({ code: 'STEP_UP_REQUIRED' });
  });
});
