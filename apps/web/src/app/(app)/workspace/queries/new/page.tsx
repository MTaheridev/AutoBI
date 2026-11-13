'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Button, EmptyState, Field, Input, Select } from '@/components/ui';

interface DataSource {
  id: string;
  name: string;
  type: string;
}

interface SemanticModel {
  id: string;
  name: string;
  dataSourceId: string;
}

interface Metric {
  id: string;
  name: string;
  expression: string;
  aggregation: string;
  status: string;
}

interface Dimension {
  id: string;
  name: string;
  field: string;
  status: string;
}

interface SnapshotTable {
  schema: string;
  name: string;
  columns: Array<{ name: string }>;
}

export default function NewQueryPage() {
  const { current } = useWorkspace();
  const router = useRouter();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [models, setModels] = useState<SemanticModel[]>([]);
  const [dataSourceId, setDataSourceId] = useState('');
  const [semanticModelId, setSemanticModelId] = useState('');
  const [name, setName] = useState('');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [tables, setTables] = useState<SnapshotTable[]>([]);
  const [metricId, setMetricId] = useState('');
  const [expression, setExpression] = useState('');
  const [aggregation, setAggregation] = useState('sum');
  const [metricAlias, setMetricAlias] = useState('value');
  const [dimensionField, setDimensionField] = useState('');
  const [dimensionAlias, setDimensionAlias] = useState('dimension');
  const [limit, setLimit] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filteredModels = useMemo(
    () => models.filter((m) => m.dataSourceId === dataSourceId),
    [models, dataSourceId],
  );

  const fieldOptions = useMemo(() => {
    const fromDims = dimensions
      .filter((d) => d.status === 'Approved' || d.status === 'Proposed')
      .map((d) => d.field);
    const fromTables = tables.flatMap((t) =>
      t.columns.map((c) => `${t.schema}.${t.name}.${c.name}`),
    );
    return [...new Set([...fromDims, ...fromTables])];
  }, [dimensions, tables]);

  useEffect(() => {
    if (!current) return;
    Promise.all([
      api<{ dataSources: DataSource[] }>(`/data-sources?workspaceId=${current.id}`),
      api<{ models: SemanticModel[] }>(`/semantic-models?workspaceId=${current.id}`),
    ]).then(([ds, sm]) => {
      setDataSources(ds.dataSources);
      setModels(sm.models);
      if (ds.dataSources[0]) setDataSourceId(ds.dataSources[0].id);
    });
  }, [current?.id]);

  useEffect(() => {
    if (!current || !dataSourceId) return;
    api<{ snapshot: { tables: SnapshotTable[] } | null }>(
      `/data-sources/${dataSourceId}/schema?workspaceId=${current.id}`,
    ).then((res) => setTables(res.snapshot?.tables ?? []));
  }, [current?.id, dataSourceId]);

  useEffect(() => {
    const match = filteredModels[0];
    setSemanticModelId(match?.id ?? '');
  }, [filteredModels]);

  useEffect(() => {
    if (!semanticModelId) {
      setMetrics([]);
      setDimensions([]);
      return;
    }
    api<{ metrics: Metric[]; dimensions: Dimension[] }>(`/semantic-models/${semanticModelId}`).then(
      (res) => {
        setMetrics(res.metrics);
        setDimensions(res.dimensions);
        const approved = res.metrics.find((m) => m.status === 'Approved') ?? res.metrics[0];
        if (approved) {
          setMetricId(approved.id);
          setAggregation(approved.aggregation);
          setMetricAlias('value');
        }
        const dim = res.dimensions.find((d) => d.status === 'Approved') ?? res.dimensions[0];
        if (dim) {
          setDimensionField(dim.field);
          setDimensionAlias('dimension');
        }
      },
    );
  }, [semanticModelId]);

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from the home page first."
      />
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const plan = {
        dataSourceId,
        metrics: [
          metricId
            ? { metricId, aggregation, alias: metricAlias }
            : { expression, aggregation, alias: metricAlias },
        ],
        dimensions: dimensionField
          ? [{ field: dimensionField, alias: dimensionAlias }]
          : [],
        filters: [],
        sort: [{ field: metricAlias, direction: 'DESC' as const }],
        limit,
      };
      const data = await api<{ query: { id: string } }>('/queries', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: current.id,
          name,
          semanticModelId: semanticModelId || undefined,
          plan,
        }),
      });
      router.push(`/workspace/queries/${data.query.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create query');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">New query</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Plans are validated against schema allow-lists before SQL compilation.
        </p>
      </div>

      <form className="panel space-y-4 p-5" onSubmit={onSubmit}>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Data source">
          <Select value={dataSourceId} onChange={(e) => setDataSourceId(e.target.value)} required>
            {dataSources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.type})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Semantic model (optional)">
          <Select value={semanticModelId} onChange={(e) => setSemanticModelId(e.target.value)}>
            <option value="">None</option>
            {filteredModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Metric (from semantics)">
            <Select
              value={metricId}
              onChange={(e) => {
                setMetricId(e.target.value);
                const m = metrics.find((x) => x.id === e.target.value);
                if (m) setAggregation(m.aggregation);
              }}
            >
              <option value="">Use raw expression</option>
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.status})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Aggregation">
            <Select value={aggregation} onChange={(e) => setAggregation(e.target.value)}>
              {['sum', 'avg', 'count', 'min', 'max', 'count_distinct'].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {!metricId && (
          <Field label="Metric expression (schema.table.column)">
            <Select value={expression} onChange={(e) => setExpression(e.target.value)} required={!metricId}>
              <option value="">Select field</option>
              {fieldOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Metric alias">
            <Input value={metricAlias} onChange={(e) => setMetricAlias(e.target.value)} required />
          </Field>
          <Field label="Limit">
            <Input
              type="number"
              min={1}
              max={10000}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Dimension field (optional)">
          <Select value={dimensionField} onChange={(e) => setDimensionField(e.target.value)}>
            <option value="">None</option>
            {fieldOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Field>
        {dimensionField && (
          <Field label="Dimension alias">
            <Input
              value={dimensionAlias}
              onChange={(e) => setDimensionAlias(e.target.value)}
              required
            />
          </Field>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button disabled={busy}>{busy ? 'Saving…' : 'Create query'}</Button>
      </form>
    </div>
  );
}
