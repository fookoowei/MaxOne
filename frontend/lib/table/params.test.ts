import { describe, expect, it } from 'vitest';
import { apiQuery, pageLabel, parseTableParams, tableHref } from './params';

const cfg = { sortFields: ['balance', 'createdAt', 'name'], defaultSort: 'createdAt:asc', filterKeys: ['currency'] };

describe('parseTableParams', () => {
  it('defaults when nothing is given', () => {
    expect(parseTableParams({}, cfg)).toEqual({ q: '', sort: 'createdAt:asc', page: 1, size: 20, filters: {}, skip: 0, take: 20 });
  });
  it('accepts whitelisted sort, valid size, filters; computes skip/take', () => {
    const p = parseTableParams({ q: ' jane ', sort: 'balance:desc', page: '3', size: '50', currency: 'usd', bogus: 'x' }, cfg);
    expect(p).toMatchObject({ q: 'jane', sort: 'balance:desc', page: 3, size: 50, filters: { currency: 'usd' }, skip: 100, take: 50 });
  });
  it('rejects a sort field or direction outside the whitelist, a bad page/size', () => {
    expect(parseTableParams({ sort: 'passwordHash:asc', page: '-2', size: '7' }, cfg)).toMatchObject({ sort: 'createdAt:asc', page: 1, size: 20 });
    expect(parseTableParams({ sort: 'balance:sideways' }, cfg).sort).toBe('createdAt:asc');
  });
});

describe('apiQuery', () => {
  it('serialises for the API with skip/take', () => {
    const p = parseTableParams({ q: 'x', sort: 'name:asc', page: '2', currency: 'EUR' }, cfg);
    expect(apiQuery(p)).toBe('q=x&sort=name%3Aasc&skip=20&take=20&currency=EUR');
  });
});

describe('tableHref', () => {
  const current = parseTableParams({ q: 'jane', sort: 'balance:desc', page: '3', currency: 'USD' }, cfg);
  it('drops defaults so links stay clean', () => {
    expect(tableHref('/wallets', parseTableParams({}, cfg), {}, cfg)).toBe('/wallets');
  });
  it('a page change keeps everything else', () => {
    expect(tableHref('/wallets', current, { page: 4 }, cfg)).toBe('/wallets?q=jane&sort=balance%3Adesc&page=4&currency=USD');
  });
  it('a search, sort, size or filter change resets to page 1', () => {
    expect(tableHref('/wallets', current, { q: 'bob' }, cfg)).toBe('/wallets?q=bob&sort=balance%3Adesc&currency=USD');
    expect(tableHref('/wallets', current, { filters: { currency: undefined } }, cfg)).toBe('/wallets?q=jane&sort=balance%3Adesc');
    expect(tableHref('/wallets', current, { size: 50 }, cfg)).toContain('size=50');
  });
});

describe('pageLabel', () => {
  it('reads like a person would say it', () => {
    expect(pageLabel(parseTableParams({ page: '2' }, cfg), 143)).toBe('21–40 of 143');
    expect(pageLabel(parseTableParams({ page: '8' }, cfg), 143)).toBe('141–143 of 143');
    expect(pageLabel(parseTableParams({}, cfg), 0)).toBe('No results');
  });
});
