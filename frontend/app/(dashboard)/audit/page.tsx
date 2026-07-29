import { GatedPlaceholder } from '@/components/gated-placeholder';

export default function AuditPage() {
  return (
    <GatedPlaceholder
      title="Audit"
      description="Inspect the immutable audit trail of every privileged action."
      permission="audit.view"
    />
  );
}
