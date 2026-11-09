import { loadEnv } from '@autobi/config';
import {
  connectorRegistry,
  registerBuiltinConnectors,
  type ConnectionConfig,
} from '@autobi/connectors';
import { prisma, type Prisma } from '@autobi/database';
import { decryptSecret } from '@autobi/shared';

registerBuiltinConnectors();

export async function processIntrospection(data: {
  dataSourceId: string;
  workspaceId: string;
}) {
  const env = loadEnv();
  const ds = await prisma.dataSource.findFirst({
    where: { id: data.dataSourceId, workspaceId: data.workspaceId },
  });

  if (!ds) {
    throw new Error('Data source not found');
  }

  const config = JSON.parse(decryptSecret(ds.encryptedConfig, env.ENCRYPTION_KEY)) as ConnectionConfig;
  const connector = connectorRegistry.create(ds.type);

  try {
    await connector.connect(config);
    const result = await connector.introspect();

    const latest = await prisma.schemaSnapshot.findFirst({
      where: { dataSourceId: ds.id },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;

    const metadata: Prisma.InputJsonValue = {
      schemas: result.schemas.map((s) => s.name),
      tables: JSON.parse(JSON.stringify(result.tables)) as Prisma.InputJsonValue,
      relationships: JSON.parse(JSON.stringify(result.relationships)) as Prisma.InputJsonValue,
    };

    await prisma.schemaSnapshot.create({
      data: {
        dataSourceId: ds.id,
        version,
        metadata,
      },
    });

    await prisma.dataSource.update({
      where: { id: ds.id },
      data: {
        introspectionStatus: 'succeeded',
        connectionStatus: 'connected',
        lastError: null,
      },
    });

    return {
      version,
      schemaCount: result.schemas.length,
      tableCount: result.tables.length,
      relationshipCount: result.relationships.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Introspection failed';
    await prisma.dataSource.update({
      where: { id: ds.id },
      data: {
        introspectionStatus: 'failed',
        lastError: message,
      },
    });
    throw error;
  } finally {
    await connector.close();
  }
}
