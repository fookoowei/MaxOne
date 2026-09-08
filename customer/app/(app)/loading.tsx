import { HeroSkeleton, ListSkeleton } from '@/components/layout/skeletons';
export default function Loading() {
  return (
    <div className="space-y-6">
      <HeroSkeleton />
      <ListSkeleton rows={5} />
    </div>
  );
}
