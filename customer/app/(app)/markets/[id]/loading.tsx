import { PageHeaderSkeleton, ListSkeleton } from '@/components/layout/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-48 w-full rounded-xl" />
      <ListSkeleton rows={3} />
    </div>
  );
}
