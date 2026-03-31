import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'turso', // libSQL 방언
    schema: './src/db/schema.ts', // 스키마 파일 위치
    out: './drizzle', // 마이그레이션 SQL 출력 폴더
    dbCredentials: {
        url: process.env.TURSO_DB_URL!, // 로컬: .dev.vars에서 주입
        authToken: process.env.TURSO_AUTH_TOKEN,
    },
});
