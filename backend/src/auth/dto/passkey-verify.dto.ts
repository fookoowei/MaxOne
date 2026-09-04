import { IsObject, IsOptional, IsString } from 'class-validator';

// The browser's WebAuthn response (from @simplewebauthn/browser) + the challenge token we issued.
export class PasskeyVerifyDto {
  @IsObject()
  response!: Record<string, unknown>;

  @IsString()
  challengeToken!: string;

  @IsOptional()
  @IsString()
  label?: string;
}
