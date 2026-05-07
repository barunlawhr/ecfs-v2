import { supabase } from '@/lib/supabase'

export interface AccountRow {
  login_id: string
  name: string
  org: string
  role: string
  email: string
  bar_num: string
  password?: string
  cohort?: string
  last_login_at?: string | null
}

/**
 * Supabase accounts 테이블에서 전체 계정 목록 조회
 */
export async function fetchAccounts(): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('login_id, name, org, role, email, bar_num, cohort, last_login_at')
    .order('login_id')
  if (error) { console.error('accounts fetch error:', error.message); return [] }
  return data || []
}

/**
 * 학생 계정만 조회
 */
export async function fetchStudents(): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('login_id, name, org, role, email, bar_num, cohort, last_login_at')
    .eq('role', 'student')
    .order('login_id')
  if (error) { console.error('students fetch error:', error.message); return [] }
  return data || []
}

/**
 * login_id로 이름 조회 (캐시용 맵 생성)
 */
export async function buildNameMap(): Promise<Record<string, string>> {
  const accounts = await fetchAccounts()
  const map: Record<string, string> = {}
  accounts.forEach(a => { map[a.login_id] = a.name })
  return map
}

/**
 * 계정 추가 (Supabase)
 */
export async function addAccount(account: {
  login_id: string; password: string; name: string;
  org?: string; role?: string; email?: string; bar_num?: string; cohort?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('accounts').insert({
    login_id: account.login_id,
    password: account.password,
    name: account.name,
    org: account.org || '',
    role: account.role || 'student',
    email: account.email || '',
    bar_num: account.bar_num || '',
    cohort: account.cohort || '',
  })
  return { error: error?.message || null }
}

/**
 * 계정 삭제 (Supabase)
 */
export async function deleteAccounts(loginIds: string[]): Promise<{ error: string | null }> {
  const { error } = await supabase.from('accounts').delete().in('login_id', loginIds)
  return { error: error?.message || null }
}
