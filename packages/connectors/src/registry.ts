import { ConnectorError } from '@autobi/shared';
import type { ConnectorFactory, ConnectorType, DatabaseConnector } from './types.js';

export class ConnectorRegistry {
  private readonly factories = new Map<ConnectorType, ConnectorFactory>();

  register(factory: ConnectorFactory): void {
    this.factories.set(factory.type, factory);
  }

  list(): ConnectorType[] {
    return [...this.factories.keys()];
  }

  create(type: ConnectorType): DatabaseConnector {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new ConnectorError(`Unknown connector type: ${type}`);
    }
    return factory.create();
  }
}

export const connectorRegistry = new ConnectorRegistry();
