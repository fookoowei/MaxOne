import { IsIn, IsOptional } from 'class-validator';
import { RANGES, type Range } from '../market-asset';

export class ChartQueryDto {
  // A timeframe, not a window: Kraken returns 720 candles at every interval, so the timeframe
  // IS the range and the user scrolls/zooms for anything in between.
  @IsOptional()
  @IsIn(RANGES)
  range: Range = '1h';
}
