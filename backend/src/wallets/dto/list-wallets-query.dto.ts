import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
}
