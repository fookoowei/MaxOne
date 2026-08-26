import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Min } from 'class-validator';

export class QuoteQueryDto {
  @IsString()
  @Length(3, 3)
  from!: string;

  @IsString()
  @Length(3, 3)
  to!: string;

  // Query strings arrive as text; @Type converts before @IsInt judges.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;
}
