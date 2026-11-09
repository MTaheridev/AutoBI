import { MySqlFamilyConnector } from './mysql-base.js';
import type { ConnectorFactory } from './types.js';

export class MySQLConnector extends MySqlFamilyConnector {
  constructor() {
    super('mysql');
  }
}

export const mysqlFactory: ConnectorFactory = {
  type: 'mysql',
  create: () => new MySQLConnector(),
};
