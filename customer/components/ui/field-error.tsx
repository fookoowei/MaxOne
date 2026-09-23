// The one line under a field that did not validate. Renders nothing when there is no message, so
// call sites can pass `errors.x?.message` without a conditional.
export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}
