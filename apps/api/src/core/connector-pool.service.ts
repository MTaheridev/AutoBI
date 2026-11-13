import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  connectorPools,
  type CompiledQuery,
  type ConnectionConfig,
  type ConnectorType,
  type QueryExecutionOptions,
  type QueryResult,
} from '@autobi/connectors';

@Injectable()
export class ConnectorPoolService implements OnModuleDestroy {
  supportsPooling(type: ConnectorType): boolean {
    return connectorPools.supports(type);
  }

  execute(
    dataSourceId: string,
    type: ConnectorType,
    config: ConnectionConfig,
    query: CompiledQuery,
    options?: QueryExecutionOptions,
  ): Promise<QueryResult> {
    return connectorPools.execute(dataSourceId, type, config, query, options);
  }

  async onModuleDestroy() {
    await connectorPools.closeAll();
  }
}
