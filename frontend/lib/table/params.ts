// Table state lives in the URL. These are the pure rules: how `?q=&sort=&page=&size=&<filter>=`
// becomes a query the API understands, and how a change becomes the next href (with defaults
// dropped so links stay clean, and `page` reset whenever the result set would change).

export const PAGE_SIZES = [20, 50, 100] as const;

export interface TableConfig {
  sortFields: readonly string[]; // whitelist mirrored from the API DTO
  defaultSort: string; // "field:asc|desc"
  filterKeys: readonly string[];
  defaultSize?: number;
}

export interface TableParams {
  q: string;
  sort: string;
  page: number; // 1-based
  size: number;
  filters: Record<string, string>;
  skip: number;
  take: number;
}

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export function parseTableParams(raw: RawParams, cfg: TableConfig): TableParams {
  const q = first(raw.q).trim().slice(0, 100);
  const [field, dir] = first(raw.sort).split(':');
  const sort = cfg.sortFields.includes(field) && (dir === 'asc' || dir === 'desc') ? `${field}:${dir}` : cfg.defaultSort;
  const sizeRaw = Number(first(raw.size));
  const size = (PAGE_SIZES as readonly number[]).includes(sizeRaw) ? sizeRaw : (cfg.defaultSize ?? PAGE_SIZES[0]);
  const page = Math.max(1, Math.floor(Number(first(raw.page)) || 1));
  const filters: Record<string, string> = {};
  for (const k of cfg.filterKeys) {
    const v = first(raw[k]).trim();
    if (v) filters[k] = v.slice(0, 60);
  }
  return { q, sort, page, size, filters, skip: (page - 1) * size, take: size };
}

/** Query string for the API: `q`, `sort`, `skip`, `take` and each filter (only when set). */
export function apiQuery(p: TableParams, opts: { sort?: boolean } = {}): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set('q', p.q);
  if (opts.sort !== false) sp.set('sort', p.sort);
  sp.set('skip', String(p.skip));
  sp.set('take', String(p.take));
  for (const [k, v] of Object.entries(p.filters)) sp.set(k, v);
  return sp.toString();
}

export type TablePatch = Partial<Pick<TableParams, 'q' | 'sort' | 'page' | 'size'>> & {
  filters?: Record<string, string | undefined>;
};

/** The next href after a change. Anything that changes the result set sends you back to page 1. */
export function tableHref(pathname: string, current: TableParams, patch: TablePatch, cfg: TableConfig): string {
  const q = patch.q ?? current.q;
  const sort = patch.sort ?? current.sort;
  const size = patch.size ?? current.size;
  const filters = { ...current.filters };
  for (const [k, v] of Object.entries(patch.filters ?? {})) {
    if (v) filters[k] = v;
    else delete filters[k];
  }
  const resets = patch.q !== undefined || patch.sort !== undefined || patch.size !== undefined || patch.filters !== undefined;
  const page = resets ? 1 : (patch.page ?? current.page);

  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (sort !== cfg.defaultSort) sp.set('sort', sort);
  if (page > 1) sp.set('page', String(page));
  if (size !== (cfg.defaultSize ?? PAGE_SIZES[0])) sp.set('size', String(size));
  for (const k of cfg.filterKeys) if (filters[k]) sp.set(k, filters[k]);
  const s = sp.toString();
  return s ? `${pathname}?${s}` : pathname;
}

export function pageLabel(p: TableParams, total: number): string {
  if (total === 0) return 'No results';
  const from = p.skip + 1;
  const to = Math.min(p.skip + p.take, total);
  return `${from}–${to} of ${total}`;
}
