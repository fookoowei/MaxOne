import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { NotFoundException } from '@nestjs/common';
import { ChartQueryDto } from './dto/chart-query.dto';
import { MarketsController } from './markets.controller';

describe('ChartQueryDto', () => {
  const dto = (q: unknown) => plainToInstance(ChartQueryDto, q);

  it('defaults to 1h when no range is given', async () => {
    const q = dto({});
    expect(await validate(q)).toHaveLength(0);
    expect(q.range).toBe('1h');
  });

  it('accepts every supported timeframe', async () => {
    for (const range of ['1m', '5m', '15m', '1h', '4h', '1D']) {
      expect(await validate(dto({ range }))).toHaveLength(0);
    }
  });

  it('rejects anything else (including the old ?days= values)', async () => {
    expect(await validate(dto({ range: '7' }))).not.toHaveLength(0);
    expect(await validate(dto({ range: '2h' }))).not.toHaveLength(0);
  });
});

describe('MarketsController', () => {
  const markets = { list: jest.fn(), detail: jest.fn(), chart: jest.fn() };
  const controller = new MarketsController(markets as never);
  beforeEach(() => jest.clearAllMocks());

  it('passes the range through to the service', async () => {
    markets.chart.mockResolvedValue({ candles: [] });
    await controller.chart('bitcoin', plainToInstance(ChartQueryDto, { range: '4h' }));
    expect(markets.chart).toHaveBeenCalledWith('bitcoin', '4h');
  });

  it('404s an unknown asset', async () => {
    markets.detail.mockResolvedValue(null);
    await expect(controller.detail('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
