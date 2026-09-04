import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TokensService } from './tokens.service';
import type { AuthUser } from './jwt.strategy';

export const STEP_UP_HEADER = 'x-step-up-token';

// Sensitive actions (transfers) require the second factor to have been re-proved moments ago.
// Users without 2FA have no factor to prove and pass through. Stacks after JwtAuthGuard.
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthUser; headers: Record<string, string | undefined> }>();
    const user = req.user;
    if (!user) throw new ForbiddenException(); // defensive: JwtAuthGuard runs first
    if (!user.totpEnabled) return true; // no second factor → nothing to step up

    const required = () =>
      new ForbiddenException({
        code: 'STEP_UP_REQUIRED',
        message: 'Re-verify your authenticator to continue',
      });
    const token = req.headers[STEP_UP_HEADER];
    if (!token) throw required();
    let sub: string;
    try {
      sub = await this.tokens.verifyStepUpGrant(token);
    } catch {
      throw required();
    }
    if (sub !== user.id) throw required(); // a grant is bound to the user it was issued to
    return true;
  }
}
