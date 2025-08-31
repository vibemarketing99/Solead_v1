/**
 * Database configuration for TypeORM
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Database connection configuration
const connectionOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'solead_db',
  
  // Entity configuration
  entities: [
    path.join(__dirname, 'entities', '*.entity.{ts,js}')
  ],
  
  // Migration configuration
  migrations: [
    path.join(__dirname, 'migrations', '*.{ts,js}')
  ],
  
  // Subscribers
  subscribers: [
    path.join(__dirname, 'subscribers', '*.{ts,js}')
  ],
  
  // Development settings
  synchronize: process.env.NODE_ENV === 'development', // Auto-sync in dev only
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  
  // Connection pool settings
  extra: {
    max: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
};

// Create and export the data source
export const AppDataSource = new DataSource(connectionOptions);

// Database connection manager
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;
  
  private constructor() {}
  
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
  
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }
    
    try {
      await AppDataSource.initialize();
      this.isConnected = true;
      const dbName = process.env.DATABASE_NAME || 'solead_db';
      const dbHost = process.env.DATABASE_HOST || 'localhost';
      const dbPort = process.env.DATABASE_PORT || '5432';
      const dbUser = process.env.DATABASE_USER || 'postgres';
      console.log(`✅ Database connected to: ${dbName}`);
      console.log(`   Host: ${dbHost}:${dbPort}`);
      console.log(`   User: ${dbUser}`);
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
  
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    
    try {
      await AppDataSource.destroy();
      this.isConnected = false;
      console.log('Database disconnected');
    } catch (error) {
      console.error('Error disconnecting database:', error);
      throw error;
    }
  }
  
  public getDataSource(): DataSource {
    return AppDataSource;
  }
  
  public isActive(): boolean {
    return this.isConnected && AppDataSource.isInitialized;
  }
}

// Export for CLI usage
export default AppDataSource;