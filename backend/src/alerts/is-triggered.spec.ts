import { isTriggered } from './is-triggered';

describe('isTriggered', () => {
  it('above: fires when price >= target (incl. equality)', () => {
    expect(isTriggered('above', 80000, 80001)).toBe(true);
    expect(isTriggered('above', 80000, 80000)).toBe(true);
    expect(isTriggered('above', 80000, 79999)).toBe(false);
  });
  it('below: fires when price <= target (incl. equality)', () => {
    expect(isTriggered('below', 70000, 69999)).toBe(true);
    expect(isTriggered('below', 70000, 70000)).toBe(true);
    expect(isTriggered('below', 70000, 70001)).toBe(false);
  });
});
