import { describe, it, expect } from 'vitest';
import { buildLineData } from './line-data';

describe('buildLineData', () => {
  it('puts points in a single dataset and passes labels through', () => {
    const data = buildLineData([100, 110, 105], ['a', 'b', 'c']);
    expect(data.labels).toEqual(['a', 'b', 'c']);
    expect(data.datasets).toHaveLength(1);
    expect(data.datasets[0].data).toEqual([100, 110, 105]);
  });
});
