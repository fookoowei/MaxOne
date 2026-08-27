import { IsIn, IsPositive, IsString, Length } from 'class-validator';

export class AddAlertDto {
  @IsString()
  @Length(1, 10)
  symbol!: string;

  @IsIn(['crypto', 'stock'])
  type!: 'crypto' | 'stock';

  @IsPositive()
  targetPrice!: number;

  @IsIn(['above', 'below'])
  direction!: 'above' | 'below';
}
