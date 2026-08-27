import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class ChartQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 7, 30])
  days: number = 7;
}
