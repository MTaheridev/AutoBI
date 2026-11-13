'use client';

import { useRouter } from 'next/navigation';
import {
  DataSourceConnectionForm,
  type ConnectionFormValues,
} from '@/components/data-source-connection-form';
import { EmptyState, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';

export default function NewDataSourcePage() {
  const { current } = useWorkspace();
  const router = useRouter();

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from the home page first."
      />
    );
  }

  async function onSubmit(values: ConnectionFormValues) {
    if (!current) return;
    const data = await api<{ dataSource: { id: string } }>('/data-sources', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: current.id,
        name: values.name,
        type: values.type,
        config: {
          host: values.host,
          port: values.port,
          database: values.database,
          username: values.username,
          password: values.password,
          ssl: values.ssl,
          schema: values.schema || undefined,
        },
      }),
    });
    router.push(`/workspace/data-sources/${data.dataSource.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Add data source"
        description="Test the connection first. Credentials are encrypted at rest and never returned by the API. Prefer a read-only database user."
      />
      <DataSourceConnectionForm
        workspaceId={current.id}
        mode="create"
        submitLabel="Save data source"
        requireTestBeforeSubmit
        onSubmit={onSubmit}
      />
    </div>
  );
}
