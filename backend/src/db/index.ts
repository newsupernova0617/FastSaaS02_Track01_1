// backend/src/db/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export type Env = {
    TURSO_DB_URL: string;
    TURSO_AUTH_TOKEN: string;
    SUPABASE_JWT_SECRET: string;
};

export function getDb(env: Env) {
    const client = createClient({
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });
    return drizzle(client, { schema });
}
