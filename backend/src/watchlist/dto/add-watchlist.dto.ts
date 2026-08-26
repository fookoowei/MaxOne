import { IsIn, IsString, Length } from 'class-validator';

export class AddWatchlistDto {
  @IsString()
  @Length(1, 10)
  symbol!: string;

  @IsIn(['crypto', 'stock'])
  type!: 'crypto' | 'stock';
}
