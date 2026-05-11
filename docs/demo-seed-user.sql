-- Demo seed data for the real account provided by the user
-- Drizzle Studio / web-console ready version
-- Target user:
--   id: b780aece-4fe3-450f-96ac-502fad1a6026
--   email: jungyujin052@gmail.com
--   name: yujin jung
--   provider: google
--   created_at: 2026-04-05 06:54:09

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------
-- Cleanup
-- ------------------------------------------------------------------
DELETE FROM chat_messages;
DELETE FROM clarification_sessions;
DELETE FROM sessions;
DELETE FROM reports;
DELETE FROM user_notes;
DELETE FROM contact_requests;
DELETE FROM user_subscriptions;
DELETE FROM transactions;
DELETE FROM users;

DELETE FROM sqlite_sequence
WHERE name IN (
  'chat_messages',
  'clarification_sessions',
  'sessions',
  'reports',
  'user_notes',
  'contact_requests',
  'user_subscriptions',
  'transactions'
);

-- ------------------------------------------------------------------
-- Users
-- ------------------------------------------------------------------
INSERT INTO users (id, email, name, avatar_url, provider, created_at) VALUES
  (
    'b780aece-4fe3-450f-96ac-502fad1a6026',
    'jungyujin052@gmail.com',
    'yujin jung',
    'https://lh3.googleusercontent.com/a/ACg8ocLKsJZlArwr36Xd3jeRAjjKsr1DZoRMYDYdNDw8QLBBD0wB=s96-c',
    'google',
    '2026-04-05 06:54:09'
  );

-- ------------------------------------------------------------------
-- Transactions: March and April data
-- ------------------------------------------------------------------
INSERT INTO transactions (id, user_id, type, amount, category, memo, date) VALUES
  (1, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'income', 3500000, '월급', NULL, '2026-03-01'),
  (2, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 980000, '월세', NULL, '2026-03-05'),
  (3, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 10000, '식비', '아침', '2026-03-08'),
  (4, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 1450, '교통', '지하철', '2026-03-12'),
  (5, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 18000, '문화여가', '영화', '2026-03-18'),
  (6, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 38000, '쇼핑', '운동화', '2026-03-20'),
  (7, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 14000, '식비', '점심', '2026-03-21'),
  (8, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 12000, '의료', '약국', '2026-03-25'),
  (9, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 8000, '기타', '주차', '2026-03-28'),
  (10, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'income', 3500000, '월급', NULL, '2026-04-01'),
  (11, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 980000, '월세', NULL, '2026-04-01'),
  (12, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 12000, '식비', '점심값', '2026-04-02'),
  (13, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 1450, '교통', '지하철', '2026-04-03'),
  (14, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 8500, '식비', '카페', '2026-04-04'),
  (15, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 56000, '쇼핑', '생활용품', '2026-04-05'),
  (16, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 14000, '문화여가', '영화', '2026-04-06'),
  (17, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 18000, '의료', '약국', '2026-04-07'),
  (18, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'income', 50000, '용돈', '생활비', '2026-04-08'),
  (19, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 22000, '식비', '마트', '2026-04-09'),
  (20, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'income', 180000, '부업', '강의료', '2026-04-10'),
  (21, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 8900, '교통', '택시', '2026-04-12'),
  (22, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 42000, '쇼핑', '셔츠', '2026-04-15'),
  (23, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 9500, '식비', '저녁', '2026-04-18'),
  (24, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 7700, '기타', 'OTT 구독', '2026-04-20'),
  (25, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 21000, '문화여가', '전시회', '2026-04-21'),
  (26, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 16000, '식비', '배달', '2026-04-22'),
  (27, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 12500, '식비', '커피', '2026-04-23'),
  (28, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 1450, '교통', '버스', '2026-04-24'),
  (29, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'income', 320000, '부업', '원고료', '2026-04-25'),
  (30, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 13200, '식비', '간식', '2026-04-26'),
  (31, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 42000, '쇼핑', '장보기', '2026-04-27'),
  (32, 'b780aece-4fe3-450f-96ac-502fad1a6026', 'expense', 26000, '식비', '외식', '2026-04-28');

-- ------------------------------------------------------------------
-- Sessions
-- ------------------------------------------------------------------
INSERT INTO sessions (id, user_id, title, created_at, updated_at) VALUES
  (1, 'b780aece-4fe3-450f-96ac-502fad1a6026', '점심 기록', '2026-04-28T10:00:00Z', '2026-04-28T10:10:02Z'),
  (2, 'b780aece-4fe3-450f-96ac-502fad1a6026', '4월 요약', '2026-04-28T10:30:00Z', '2026-04-28T10:45:02Z'),
  (3, 'b780aece-4fe3-450f-96ac-502fad1a6026', '식비 조회', '2026-04-28T11:00:00Z', '2026-04-28T11:05:02Z');

-- ------------------------------------------------------------------
-- Reports
-- ------------------------------------------------------------------
INSERT INTO reports (
  id,
  user_id,
  report_type,
  title,
  subtitle,
  report_data,
  summary_data,
  params,
  created_at,
  updated_at
) VALUES (
  1,
  'b780aece-4fe3-450f-96ac-502fad1a6026',
  'monthly_summary',
  '월간 요약',
  '2026-04 기준',
  '[{"type":"card","title":"총 지출","subtitle":"2026-04 기준","metric":"₩1,312,200","trend":"up","data":{"value":1312200,"transactionCount":23}},{"type":"pie","title":"카테고리별 지출","data":{"labels":["월세","쇼핑","식비","문화여가","의료","교통","기타"],"values":[980000,140000,119700,35000,18000,11800,7700]}},{"type":"bar","title":"수입/지출 비교","data":{"labels":["수입","지출"],"values":[4050000,1312200]}},{"type":"line","title":"순현금흐름","data":{"labels":["2026-04"],"values":[2737800]}},{"type":"alert","title":"상태 점검","data":{"message":"특이한 위험 신호는 없습니다."}},{"type":"suggestion","title":"다음에 해볼 일","data":{"message":"월세 지출 비중이 가장 큽니다. 이번 달 예산부터 다시 확인해 보세요."}}]',
  '{"periodLabel":"2026-04 기준","totalExpense":1312200,"totalIncome":4050000,"netAmount":2737800,"deltaPercent":21.3,"insight":"이번 달은 월세 지출이 가장 컸고, 지난 기간보다 21.3% 늘었습니다.","breakdown":[{"label":"월세","amount":980000,"ratio":75},{"label":"쇼핑","amount":140000,"ratio":11},{"label":"식비","amount":119700,"ratio":9}]}',
  '{"month":"2026-04"}',
  '2026-04-28T11:10:00Z',
  '2026-04-28T11:10:00Z'
);

INSERT INTO reports (
  id,
  user_id,
  report_type,
  title,
  subtitle,
  report_data,
  summary_data,
  params,
  created_at,
  updated_at
) VALUES (
  2,
  'b780aece-4fe3-450f-96ac-502fad1a6026',
  'weekly_summary',
  '주간 요약',
  '2026-04-21 ~ 2026-04-27 기준',
  '[{"type":"card","title":"총 지출","subtitle":"2026-04-21 ~ 2026-04-27 기준","metric":"₩106,150","trend":"up","data":{"value":106150,"transactionCount":7}},{"type":"pie","title":"카테고리별 지출","data":{"labels":["쇼핑","식비","문화여가","교통"],"values":[42000,41700,21000,1450]}},{"type":"bar","title":"수입/지출 비교","data":{"labels":["수입","지출"],"values":[320000,106150]}},{"type":"line","title":"순현금흐름","data":{"labels":["2026-04-21 ~ 2026-04-27"],"values":[213850]}},{"type":"alert","title":"상태 점검","data":{"message":"특이한 위험 신호는 없습니다."}},{"type":"suggestion","title":"다음에 해볼 일","data":{"message":"쇼핑 지출 비중이 가장 큽니다. 이번 주 예산부터 확인해 보세요."}}]',
  '{"periodLabel":"2026-04-21 ~ 2026-04-27 기준","totalExpense":106150,"totalIncome":320000,"netAmount":213850,"deltaPercent":56.8,"insight":"이번 주는 쇼핑 지출이 가장 큰 비중을 차지합니다.","breakdown":[{"label":"쇼핑","amount":42000,"ratio":40},{"label":"식비","amount":41700,"ratio":39},{"label":"문화여가","amount":21000,"ratio":20}]}',
  '{"weekStart":"2026-04-21","weekEnd":"2026-04-27"}',
  '2026-04-28T10:40:00Z',
  '2026-04-28T10:40:00Z'
);

INSERT INTO reports (
  id,
  user_id,
  report_type,
  title,
  subtitle,
  report_data,
  summary_data,
  params,
  created_at,
  updated_at
) VALUES (
  3,
  'b780aece-4fe3-450f-96ac-502fad1a6026',
  'category_detail',
  '카테고리 분석',
  '식비 · 2026-04 기준',
  '[{"type":"card","title":"총 지출","subtitle":"식비 · 2026-04 기준","metric":"₩119,700","trend":"stable","data":{"value":119700,"transactionCount":8}},{"type":"pie","title":"카테고리별 지출","data":{"labels":["식비"],"values":[119700]}},{"type":"bar","title":"수입/지출 비교","data":{"labels":["수입","지출"],"values":[0,119700]}},{"type":"line","title":"순현금흐름","data":{"labels":["2026-04"],"values":[-119700]}},{"type":"alert","title":"상태 점검","data":{"message":"특이한 위험 신호는 없습니다."}},{"type":"suggestion","title":"다음에 해볼 일","data":{"message":"식비 지출 비중이 가장 큽니다. 다음 식비를 기록할 때 예산부터 확인해 보세요."}}]',
  '{"periodLabel":"2026-04 기준","totalExpense":119700,"totalIncome":0,"netAmount":-119700,"deltaPercent":null,"insight":"이번 달은 식비 지출이 가장 큰 비중을 차지합니다.","breakdown":[{"label":"식비","amount":119700,"ratio":100}]}',
  '{"month":"2026-04","category":"식비"}',
  '2026-04-28T10:20:00Z',
  '2026-04-28T10:20:00Z'
);

-- ------------------------------------------------------------------
-- Chat messages
-- ------------------------------------------------------------------
INSERT INTO chat_messages (id, user_id, session_id, role, content, metadata, created_at) VALUES
  (1, 'b780aece-4fe3-450f-96ac-502fad1a6026', 1, 'user', '어제 점심 12000원 썼어', NULL, '2026-04-28T10:10:00Z'),
  (2, 'b780aece-4fe3-450f-96ac-502fad1a6026', 1, 'assistant', '지출 ₩12,000 식비로 2026-04-02에 저장되었습니다', '{"actionType":"create","action":{"count":1,"ids":[12],"totalAmount":12000}}', '2026-04-28T10:10:02Z'),
  (3, 'b780aece-4fe3-450f-96ac-502fad1a6026', 2, 'user', '이번달 리포트 만들어줘', NULL, '2026-04-28T10:45:00Z'),
  (4, 'b780aece-4fe3-450f-96ac-502fad1a6026', 2, 'assistant', '📊 월간 요약 2026-04 기준 리포트를 생성했습니다', '{"actionType":"report","report":{"id":1}}', '2026-04-28T10:45:02Z'),
  (5, 'b780aece-4fe3-450f-96ac-502fad1a6026', 3, 'user', '이번달 식비 얼마야?', NULL, '2026-04-28T11:05:00Z'),
  (6, 'b780aece-4fe3-450f-96ac-502fad1a6026', 3, 'assistant', '2026-04월 식비 거래 8건 조회됨 (총 ₩119,700)', '{"actionType":"read","action":{"month":"2026-04","category":"식비","type":"expense","count":8},"summary":{"periodLabel":"2026-04","categoryLabel":"식비","totalAmount":119700,"count":8,"dailyAverage":14963,"breakdown":[{"label":"외식","amount":26000},{"label":"마트","amount":22000},{"label":"배달","amount":16000}],"insight":"식비 중 외식 항목이 가장 큽니다."},"transactions":[{"id":32,"userId":"b780aece-4fe3-450f-96ac-502fad1a6026","type":"expense","amount":26000,"category":"식비","memo":"외식","date":"2026-04-28","createdAt":"2026-04-28T09:00:00Z"},{"id":30,"userId":"b780aece-4fe3-450f-96ac-502fad1a6026","type":"expense","amount":13200,"category":"식비","memo":"간식","date":"2026-04-26","createdAt":"2026-04-26T09:00:00Z"},{"id":27,"userId":"b780aece-4fe3-450f-96ac-502fad1a6026","type":"expense","amount":12500,"category":"식비","memo":"커피","date":"2026-04-23","createdAt":"2026-04-23T09:00:00Z"},{"id":26,"userId":"b780aece-4fe3-450f-96ac-502fad1a6026","type":"expense","amount":16000,"category":"식비","memo":"배달","date":"2026-04-22","createdAt":"2026-04-22T09:00:00Z"},{"id":23,"userId":"b780aece-4fe3-450f-96ac-502fad1a6026","type":"expense","amount":9500,"category":"식비","memo":"저녁","date":"2026-04-18","createdAt":"2026-04-18T09:00:00Z"},{"id":19,"userId":"b780aece-4fe3-450f-96ac-502fad1a6026","type":"expense","amount":22000,"category":"식비","memo":"마트","date":"2026-04-09","createdAt":"2026-04-09T09:00:00Z"},{"id":14,"userId":"b780aece-4fe3-450f-96ac-502fad1a6026","type":"expense","amount":8500,"category":"식비","memo":"카페","date":"2026-04-04","createdAt":"2026-04-04T09:00:00Z"},{"id":12,"userId":"b780aece-4fe3-450f-96ac-502fad1a6026","type":"expense","amount":12000,"category":"식비","memo":"점심값","date":"2026-04-02","createdAt":"2026-04-02T09:00:00Z"}]}', '2026-04-28T11:05:02Z');

-- ------------------------------------------------------------------
-- User notes
-- ------------------------------------------------------------------
INSERT INTO user_notes (id, user_id, content, embedding_id, created_at, updated_at) VALUES
  (1, 'b780aece-4fe3-450f-96ac-502fad1a6026', '식비는 점심, 카페, 배달로 나눠서 본다.', NULL, '2026-04-28T09:10:00Z', '2026-04-28T09:10:00Z'),
  (2, 'b780aece-4fe3-450f-96ac-502fad1a6026', '월말에는 월세와 구독부터 먼저 확인한다.', NULL, '2026-04-28T09:20:00Z', '2026-04-28T09:20:00Z');

-- ------------------------------------------------------------------
-- Optional Bob account for isolation testing
-- ------------------------------------------------------------------
INSERT INTO users (id, email, name, avatar_url, provider, created_at) VALUES
  ('demo-bob', 'bob@example.com', 'Bob', NULL, 'test', '2026-04-01T09:05:00Z');

INSERT INTO transactions (id, user_id, type, amount, category, memo, date) VALUES
  (101, 'demo-bob', 'expense', 15000, '식비', '점심', '2026-04-14'),
  (102, 'demo-bob', 'income', 120000, '용돈', '가족 지원', '2026-04-15');
