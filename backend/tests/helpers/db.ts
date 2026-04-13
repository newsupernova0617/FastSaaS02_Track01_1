import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type Client } from '@libsql/client';
import { createDb } from '../../src/db/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../src/db/migrations');

function stripLineComments(sql: string): string {
  // Remove single-line SQL comments (-- ...) while preserving newlines
  return sql
    .split('\n')
    .map((line) => {
      const commentIdx = line.indexOf('--');
      return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    })
    .join('\n');
}

function loadMigrationStatements(): string[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const statements: string[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const stripped = stripLineComments(raw);
    for (const chunk of stripped.split(';')) {
      const trimmed = chunk.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
    }
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
