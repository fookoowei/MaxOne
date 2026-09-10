import { Spinner } from '@/components/ui/spinner';

// The one loading state for every route: a spinner centred in the content column. Replaces the
// M18 skeletons + on-tab spinner (2026-09-10): the user wanted progress shown where the page is
// about to appear, not on the tab they tapped.
export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" label="Loading page" className="text-muted-foreground" />
    </div>
  );
}
