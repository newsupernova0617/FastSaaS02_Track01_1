# Backend Folder Structure

해당 다이어그램은 제시해주신 이미지와 유사한 시각적 디자인(색상 체계 및 레이아웃)을 바탕으로 현재 `budget-app` 프로젝트의 백엔드 폴더 구조를 나타낸 것입니다.

```mermaid
graph TD
    %% Base Folder
    Backend["backend/"]

    %% Root Files
    Backend --- PkgJson("package.json")
    Backend --- Wrangler("wrangler.jsonc")
    Backend --- Configs("drizzle/vitest configs")

    %% Roots Level Subfolders (Level 1)
    Backend --- Drizzle["drizzle/"]
    Backend --- Src["src/"]
    
    %% Src Files
    Src --- SrcIndex("index.ts")
    
    %% Sub Folders (Level 2)
    Src --- Db["db/"]
    Src --- Middleware["middleware/"]
    Src --- Routes["routes/"]
    
    %% Db Files
    Db --- DbIndex("index.ts")
    Db --- DbSchema("schema.ts")

    %% Middleware Files
    Middleware --- MidAuth("auth.ts")
    Middleware --- MidAuthTest("auth.test.ts")
    
    %% Routes Files
    Routes --- RoutesTx("transactions.ts")
    Routes --- RoutesUser("users.ts")

    %% 스타일 정의 (이미지와 유사한 배색 적용)
    classDef mainFolder fill:#2D7B93,stroke:#2D7B93,stroke-width:2px,color:#fff,rx:8px,ry:8px,font-weight:bold;
    classDef folder fill:#DE9033,stroke:#DE9033,stroke-width:2px,color:#fff,rx:8px,ry:8px,font-weight:bold;
    classDef subFolder fill:#65A8B2,stroke:#65A8B2,stroke-width:2px,color:#fff,rx:8px,ry:8px,font-weight:bold;
    classDef file fill:#BDBDBD,stroke:#BDBDBD,stroke-width:2px,color:#333,rx:8px,ry:8px;

    %% 각 노드별 스타일 할당
    class Backend mainFolder;
    class Drizzle,Src folder;
    class Db,Middleware,Routes subFolder;
    class PkgJson,Wrangler,Configs,SrcIndex,DbIndex,DbSchema,MidAuth,MidAuthTest,RoutesTx,RoutesUser file;
```

위 구조의 역할은 다음과 같습니다:
- **`backend/`**: 백엔드 애플리케이션 최상위 디렉토리 (Cloudflare Workers 환경)
- **`src/`**: 실제 코드가 돌아가는 진입점(`index.ts`)과 라우트, 미들웨어가 위치
- **`db/`**: Turso(SQLite) 커넥션과 Drizzle ORM 테이블 스키마 정의
- **`middleware/`**: JWT 기반 사용자 인증 등 커스텀 미들웨어 로직
- **`routes/`**: 각 도메인별(사용자, 가계부내역) 엔드포인트 API 컨트롤러
