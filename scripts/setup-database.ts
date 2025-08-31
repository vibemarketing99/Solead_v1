#!/usr/bin/env ts-node

/**
 * Database setup script
 * Creates the database and runs initial migrations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../src/database/config';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

const DATABASE_NAME = process.env.DATABASE_NAME || 'solead_db';
const DATABASE_USER = process.env.DATABASE_USER || 'postgres';
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'postgres';
const DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
const DATABASE_PORT = process.env.DATABASE_PORT || '5432';

async function createDatabase() {
  console.log('\n🔧 Setting up database...');
  console.log(`   Database: ${DATABASE_NAME}`);
  console.log(`   Host: ${DATABASE_HOST}:${DATABASE_PORT}`);
  console.log(`   User: ${DATABASE_USER}\n`);
  
  try {
    // Check if database exists
    const checkCmd = `PGPASSWORD=${DATABASE_PASSWORD} psql -h ${DATABASE_HOST} -p ${DATABASE_PORT} -U ${DATABASE_USER} -lqt | cut -d \\| -f 1 | grep -qw ${DATABASE_NAME}`;
    
    try {
      await execAsync(checkCmd);
      console.log(`ℹ️  Database '${DATABASE_NAME}' already exists`);
    } catch {
      // Database doesn't exist, create it
      console.log(`📦 Creating database '${DATABASE_NAME}'...`);
      const createCmd = `PGPASSWORD=${DATABASE_PASSWORD} createdb -h ${DATABASE_HOST} -p ${DATABASE_PORT} -U ${DATABASE_USER} ${DATABASE_NAME}`;
      await execAsync(createCmd);
      console.log(`✅ Database '${DATABASE_NAME}' created successfully`);
    }
  } catch (error) {
    console.error(`❌ Error creating database:`, error);
    console.log('\n💡 Make sure PostgreSQL is running and credentials are correct');
    console.log('   You can also create the database manually:');
    console.log(`   createdb ${DATABASE_NAME}`);
    process.exit(1);
  }
}

async function runMigrations() {
  console.log('\n🏃 Running migrations...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
    
    // Run migrations
    await AppDataSource.runMigrations();
    console.log('✅ Migrations completed successfully');
    
    // Close connection
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('========================================');
  console.log('   Solead Database Setup');
  console.log('========================================');
  
  await createDatabase();
  await runMigrations();
  
  console.log('\n========================================');
  console.log('✅ Database setup completed!');
  console.log('========================================');
  console.log('\n📝 Connection details for TablePlus:');
  console.log(`   Host: ${DATABASE_HOST}`);
  console.log(`   Port: ${DATABASE_PORT}`);
  console.log(`   Database: ${DATABASE_NAME}`);
  console.log(`   User: ${DATABASE_USER}`);
  console.log(`   Password: ${DATABASE_PASSWORD}`);
  console.log('\n🚀 You can now start the application!');
}

main().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});