import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * Query-string filters. Everything is optional; `@Type` conversions are what let the global
 * ValidationPipe (transform: true) turn raw strings into Dates and numbers.
 *
 * Note the deliberate difference from ListUsersQueryDto, which enforces its cap with @Max(100)
 * (so take=5000 is a 400). Here the cap is applied in the service instead, so it protects EVERY
 * caller — including a future job or another service that never passes through this DTO — and
 * take=5000 is clamped to 100 rather than rejected. Do not "fix" this into a @Max; the service
 * unit test asserts the clamp.
 */
export class AuditQueryDto {
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsIn(['transaction', 'wallet', 'user'])
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;
}
