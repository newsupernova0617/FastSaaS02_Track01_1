import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'fs';

// .dev.vars 파일에서 환경변수 로드 (drizzle-kit은 wrangler의 .dev.vars를 자동으로 읽지 않음)
try {
    const vars = readFileSync('.dev.vars', 'utf-8');
    vars.split('\n').forEach((line) => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    });
} catch { }

export default defineConfig({
    dialect: 'turso', // libSQL 방언
    schema: './src/db/schema.ts', // 스키마 파일 위치
    out: './drizzle', // 마이그레이션 SQL 출력 폴더
    dbCredentials: {
        url: process.env.TURSO_DB_URL!, // 로컬: .dev.vars에서 주입
        authToken: process.env.TURSO_AUTH_TOKEN,
    },
});
