import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Workers Bindings 타입
export type Env = {
    TURSO_DB_URL: string;
    TURSO_AUTH_TOKEN: string;
};

// 요청마다 새 클라이언트 생성 (Workers stateless)
export function getDb(env: Env) {
    const client = createClient({
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });
    return drizzle(client, { schema }); // 스키마 타입 연결
}
