export interface AuditEntry {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit entries.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">When</th>
            <th className="px-4 py-2 font-medium">Action</th>
            <th className="px-4 py-2 font-medium">Entity</th>
            <th className="px-4 py-2 font-medium">Before → After</th>
            <th className="px-4 py-2 font-medium">Actor</th>
            <th className="px-4 py-2 font-medium">IP</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b align-top last:border-0">
              <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2 font-medium">{e.action}</td>
              <td className="px-4 py-2">
                {e.entityType}
                <span className="block text-xs text-muted-foreground">{e.entityId.slice(0, 8)}</span>
              </td>
              <td className="px-4 py-2">
                <code className="text-xs">{JSON.stringify(e.oldValue)}</code>
                <span className="px-1">→</span>
                <code className="text-xs">{JSON.stringify(e.newValue)}</code>
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{e.actorUserId.slice(0, 8)}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{e.ipAddress ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
