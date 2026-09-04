import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthUser } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { Login2faDto } from './dto/login-2fa.dto';
import { PasskeysService } from './passkeys.service';
import { PasskeyVerifyDto } from './dto/passkey-verify.dto';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokensService: TokensService,
    private readonly twoFactor: TwoFactorService,
    private readonly passkeys: PasskeysService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Brute-force is the real risk here: 5 attempts/min/IP (tighter than the global 100/min).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    // Returns { user, tokens } — the BFF sets cookies from tokens and returns user.
    return this.authService.login(dto);
  }

  // Second login step (2FA on): challenge + TOTP/recovery code → the real tokens. Throttled like login.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login/2fa')
  login2fa(@Body() dto: Login2faDto) {
    return this.authService.login2fa(dto.challengeToken, dto.code);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.tokensService.rotate(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.tokensService.revoke(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // Short-lived ticket so the browser can open a WebSocket directly to the backend.
  @UseGuards(JwtAuthGuard)
  @Post('ws-ticket')
  async wsTicket(@CurrentUser() user: AuthUser) {
    return { ticket: await this.tokensService.issueWsTicket(user.id) };
  }

  // ── 2FA management (authed) ──
  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup2fa(@CurrentUser() user: AuthUser) {
    return this.twoFactor.setup(user.id, user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  verify2fa(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactor.verifyAndEnable(user.id, dto.code); // → { recoveryCodes } once
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(204)
  async disable2fa(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto): Promise<void> {
    await this.twoFactor.disable(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('2fa/status')
  status2fa(@CurrentUser() user: AuthUser) {
    return this.twoFactor.status(user.id);
  }

  // Step-up: re-prove the second factor right before a sensitive action → a 5-min grant the
  // StepUpGuard accepts (sent back as the x-step-up-token header).
  @UseGuards(JwtAuthGuard)
  @Post('step-up')
  async stepUp(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    if (!user.totpEnabled) throw new BadRequestException('2FA is not enabled');
    if (!(await this.twoFactor.verifyForLogin(user.id, dto.code))) {
      throw new UnauthorizedException('Invalid code');
    }
    return { stepUpToken: await this.tokensService.issueStepUpGrant(user.id) };
  }

  // ── Passkeys (WebAuthn). Each ceremony = options (server mints a challenge) → the browser
  // asks the authenticator → verify (server checks the signed response). ──
  @UseGuards(JwtAuthGuard)
  @Post('passkeys/register/options')
  passkeyRegisterOptions(@CurrentUser() user: AuthUser) {
    return this.passkeys.registrationOptions({ id: user.id, email: user.email });
  }

  @UseGuards(JwtAuthGuard)
  @Post('passkeys/register/verify')
  passkeyRegisterVerify(@CurrentUser() user: AuthUser, @Body() dto: PasskeyVerifyDto) {
    return this.passkeys.verifyRegistration(
      user.id,
      dto.response as unknown as RegistrationResponseJSON,
      dto.challengeToken,
      dto.label,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('passkeys')
  listPasskeys(@CurrentUser() user: AuthUser) {
    return this.passkeys.list(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('passkeys/:id')
  @HttpCode(204)
  async removePasskey(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.passkeys.remove(user.id, id);
  }

  // Usernameless sign-in: no email needed — the device offers its passkeys for this RP.
  @Post('passkeys/login/options')
  passkeyLoginOptions() {
    return this.passkeys.authenticationOptions();
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('passkeys/login/verify')
  async passkeyLoginVerify(@Body() dto: PasskeyVerifyDto) {
    const userId = await this.passkeys.verifyAuthentication(
      dto.response as unknown as AuthenticationResponseJSON,
      dto.challengeToken,
    );
    return this.authService.loginWithPasskey(userId); // { user, tokens } — no TOTP step
  }

  // Step-up via passkey: the ceremony must resolve to THIS user → a step-up grant.
  @UseGuards(JwtAuthGuard)
  @Post('step-up/passkey/options')
  stepUpPasskeyOptions() {
    return this.passkeys.authenticationOptions();
  }

  @UseGuards(JwtAuthGuard)
  @Post('step-up/passkey/verify')
  async stepUpPasskeyVerify(@CurrentUser() user: AuthUser, @Body() dto: PasskeyVerifyDto) {
    await this.passkeys.verifyAuthentication(
      dto.response as unknown as AuthenticationResponseJSON,
      dto.challengeToken,
      user.id,
    );
    return { stepUpToken: await this.tokensService.issueStepUpGrant(user.id) };
  }
}
