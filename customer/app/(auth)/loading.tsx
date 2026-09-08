import { FormSkeleton, PageHeaderSkeleton } from '@/components/layout/skeletons';
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[420px] space-y-6 px-5 pt-8">
      <PageHeaderSkeleton />
      <FormSkeleton fields={2} />
    </div>
  );
}
