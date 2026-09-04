import { IsString } from 'class-validator';

export class Login2faDto {
  @IsString()
  challengeToken!: string;

  @IsString()
  code!: string;
}
