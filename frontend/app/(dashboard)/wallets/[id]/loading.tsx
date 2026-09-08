import { CardGridSkeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/skeletons';
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={2} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
