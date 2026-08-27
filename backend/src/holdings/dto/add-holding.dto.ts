import { IsIn, IsPositive, IsString, Length } from 'class-validator';

export class AddHoldingDto {
  @IsString()
  @Length(1, 10)
  symbol!: string;

  @IsIn(['crypto', 'stock'])
  type!: 'crypto' | 'stock';

  @IsPositive()
  quantity!: number;

  @IsPositive()
  avgCost!: number;
}
