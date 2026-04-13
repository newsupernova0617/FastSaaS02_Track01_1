import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type Client } from '@libsql/client';
import { createDb } from '../../src/db/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HELPERS_DIR = __dirname;
const MIGRATIONS_DIR = path.resolve(__dirname, '../../src/db/migrations');

function loadMigrationStatements(): string[] {
  const statements: string[] = [];

  // Helper function to process a SQL file into statements
  function processFile(filePath: string) {
    const sql = fs.readFileSync(filePath, 'utf-8');
    for (const raw of sql.split(';')) {
      // Strip line comments and check if anything remains
      const lines = raw.split('\n').filter(line => !line.trim().startsWith('--'));
      const trimmed = lines.join('\n').trim();
      if (trimmed) {
        statements.push(trimmed);
      }
    }
  }

  // 1. Load the test-only base schema first (creates tables that migrations expect)
  const initFile = path.join(HELPERS_DIR, 'init.sql');
  if (fs.existsSync(initFile)) {
    processFile(initFile);
  }

  // 2. Load production migrations in order (001_, 002_, ...)
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    processFile(path.join(MIGRATIONS_DIR, file));
  }

  return statements;
}

const MIGRATION_STATEMENTS = loadMigrationStatements();

export interface TestDbHandle {
  db: ReturnType<typeof createDb>;
  client: Client;
}

export async function createTestDb(): Promise<TestDbHandle> {
  const client = createClient({ url: ':memory:' });
  for (const stmt of MIGRATION_STATEMENTS) {
    try {
      await client.execute(stmt);
    } catch (err) {
      throw new Error(
        `Migration statement failed:\n${stmt.slice(0, 200)}\n\n${(err as Error).message}`
      );
    }
  }
  const db = createDb(client);
  return { db, client };
}
