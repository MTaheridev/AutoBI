import { allowPrivateDbHosts, loadEnv } from '@autobi/config';
import { connectorRegistry, registerBuiltinConnectors, } from '@autobi/connectors';
import { prisma } from '@autobi/database';
import { assertSafeDbHost, decryptSecret, summarizeInternalError, } from '@autobi/shared';
registerBuiltinConnectors();
export async function processIntrospection(data) {
    const env = loadEnv();
    const ds = await prisma.dataSource.findFirst({
        where: { id: data.dataSourceId, workspaceId: data.workspaceId },
    });
    if (!ds) {
        throw new Error('Data source not found');
    }
    const config = JSON.parse(decryptSecret(ds.encryptedConfig, env.ENCRYPTION_KEY));
    await assertSafeDbHost(config.host, { allowPrivate: allowPrivateDbHosts(env) });
    const connector = connectorRegistry.create(ds.type);
    try {
        await connector.connect(config);
        const result = await connector.introspect();
        const latest = await prisma.schemaSnapshot.findFirst({
            where: { dataSourceId: ds.id },
            orderBy: { version: 'desc' },
        });
        const version = (latest?.version ?? 0) + 1;
        const metadata = {
            schemas: result.schemas.map((s) => s.name),
            tables: JSON.parse(JSON.stringify(result.tables)),
            relationships: JSON.parse(JSON.stringify(result.relationships)),
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
    }
    catch (error) {
        await prisma.dataSource.update({
            where: { id: ds.id },
            data: {
                introspectionStatus: 'failed',
                lastError: summarizeInternalError(error),
            },
        });
        throw error;
    }
    finally {
        await connector.close();
    }
}
//# sourceMappingURL=introspection.processor.js.map