import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @Matches(/^[a-z][a-z0-9_]{2,19}$/, {
    message: 'Handle must be 3–20 chars: lowercase letters, digits or _, starting with a letter',
  })
  handle!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;
}
