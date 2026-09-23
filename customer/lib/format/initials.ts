// "Jane Doe" → "JD". Up to two letters, upper-cased; `fallback` when the name is empty.
export function initials(name: string, fallback = 'ME'): string {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || fallback
  );
}
