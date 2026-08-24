import { Matches } from 'class-validator';

export class LookupQueryDto {
  @Matches(/^[a-z][a-z0-9_]{2,19}$/, { message: 'Invalid handle' })
  handle!: string;
}
