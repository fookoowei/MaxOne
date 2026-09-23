import type { ChangeEvent } from 'react';

/**
 * Numeric fields accept anything a keyboard can produce and keep only what the value can be —
 * on every keystroke, so a symbol or a letter never even appears. Each field edits a STRING:
 * "0." and "12.5" are states a person passes through, and a float would collapse them. The
 * schema still validates the finished string; this only keeps typing honest.
 */
export interface DecimalLimits {
  /** Digits before the point. 9 → 999,999,999, far beyond any wallet, well inside a phone screen. */
  maxWhole: number;
  /** Digits after the point. */
  maxDecimals: number;
}

export function sanitizeDecimal(raw: string, { maxWhole, maxDecimals }: DecimalLimits): string {
  let out = '';
  for (const ch of raw) {
    if (ch === '.') {
      if (maxDecimals === 0 || out.includes('.')) continue;
      out = out === '' ? '0.' : `${out}.`;
      continue;
    }
    if (ch < '0' || ch > '9') continue; // commas, spaces, letters, minus signs, currency symbols
    const [whole, frac] = out.split('.');
    if (out.includes('.')) {
      if ((frac ?? '').length >= maxDecimals) continue;
      out += ch;
    } else if (whole === '0') {
      out = ch === '0' ? '0' : ch; // "0" then "5" → "5", never "05"
    } else if (whole.length < maxWhole) {
      out += ch;
    }
  }
  return out;
}

/** Money in a 2-decimal currency: deposits, withdrawals, sends, exchanges. */
export const sanitizeAmount = (raw: string) => sanitizeDecimal(raw, { maxWhole: 9, maxDecimals: 2 });
/** A market price — sub-$1 assets are quoted to 4 decimals (see formatPrice). */
export const sanitizePrice = (raw: string) => sanitizeDecimal(raw, { maxWhole: 9, maxDecimals: 4 });
/** A holding's quantity — crypto is held in fractions as small as a satoshi. */
export const sanitizeQuantity = (raw: string) => sanitizeDecimal(raw, { maxWhole: 9, maxDecimals: 8 });

/** Digits only, capped: a 6-digit authenticator code. */
export function sanitizeDigits(raw: string, max: number): string {
  return raw.replace(/\D/g, '').slice(0, max);
}

/**
 * Wrap a react-hook-form `register()` result so the DOM value is cleaned BEFORE the form reads
 * it. The field stays uncontrolled; only the keystroke is filtered.
 */
export function withSanitizer<T extends { onChange: (e: ChangeEvent<HTMLInputElement>) => unknown }>(field: T, sanitize: (raw: string) => string): T {
  return {
    ...field,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      e.target.value = sanitize(e.target.value);
      return field.onChange(e);
    },
  };
}
