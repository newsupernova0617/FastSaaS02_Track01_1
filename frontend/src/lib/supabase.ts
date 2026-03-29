import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 읽기
// VITE_* 접두사는 Vite 빌드 도구가 클라이언트에 노출할 수 있는 변수 표시
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Supabase 클라이언트 초기화 (전체 앱에서 사용할 싱글톤)
// anon key는 비공개키가 아니지만, RLS(Row Level Security)로 접근 제어
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
