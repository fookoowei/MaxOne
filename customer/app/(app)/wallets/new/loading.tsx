import { FormSkeleton, PageHeaderSkeleton } from '@/components/layout/skeletons';
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FormSkeleton fields={2} />
    </div>
  );
}
