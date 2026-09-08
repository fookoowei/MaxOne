import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class ListWalletsQueryDto {
  // Query strings arrive as text; @Type converts before @IsInt judges (global
  // ValidationPipe runs with transform: true).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // hard cap: never let a caller ask for the whole table
  take?: number = 20;

  // M18b: staff-console table state.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsIn(['balance:asc', 'balance:desc', 'createdAt:asc', 'createdAt:desc', 'name:asc', 'name:desc'])
  sort?: string;
}
