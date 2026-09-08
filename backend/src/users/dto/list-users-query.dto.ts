import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListUsersQueryDto {
  // Query strings always arrive as text ("10", not 10). @Type tells the global
  // ValidationPipe (transform: true) to convert before @IsInt judges it.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // hard cap: a caller must never be able to ask for the whole table
  take?: number = 20;

  // M18b: staff-console table state. Everything optional; sort is a whitelist, never a raw column.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  role?: string;

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @IsOptional()
  @IsIn(['createdAt:asc', 'createdAt:desc', 'email:asc', 'email:desc', 'status:asc', 'status:desc'])
  sort?: string;
}
