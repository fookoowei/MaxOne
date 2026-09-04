import { IsString } from 'class-validator';

export class TwoFactorCodeDto {
  @IsString()
  code!: string;
}
