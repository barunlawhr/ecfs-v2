import type { User } from '@/types'

const SB_URL = 'https://knpvayujykoqjncctxrr.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucHZheXVqeWtvcWpuY2N0eHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3NDUsImV4cCI6MjA4OTE0Njc0NX0.rXlo5IsOW6FS5N1X3vgqNM1RvzB84TYPqVhnYyc6FSg'

export interface AccountRecord {
  pw: string
  name: string
  org: string
  role: 'student' | 'admin'
  barNum: string
  addr: string
  tel: string
  email: string
}

export const HARDCODED_ACCOUNTS: Record<string, AccountRecord> = {
  student01: { pw: 'court1234', name: '김바른', org: '바른법률사무소', role: 'student', barNum: '서울20113', addr: '서울 서초구 서초대로 107', tel: '010-2111-3077', email: 'student01@barun.law' },
  student02: { pw: 'court1234', name: '이바른', org: '한결법률사무소', role: 'student', barNum: '서울20226', addr: '서울 서초구 서초대로 114', tel: '010-2222-3154', email: 'student02@barun.law' },
  student03: { pw: 'court1234', name: '박바른', org: '정직법률사무소', role: 'student', barNum: '서울20339', addr: '서울 서초구 서초대로 121', tel: '010-2333-3231', email: 'student03@barun.law' },
  student04: { pw: 'court1234', name: '최바른', org: '신뢰법률사무소', role: 'student', barNum: '서울20452', addr: '서울 서초구 서초대로 128', tel: '010-2444-3308', email: 'student04@barun.law' },
  student05: { pw: 'court1234', name: '정바른', org: '공정법률사무소', role: 'student', barNum: '서울20565', addr: '서울 서초구 서초대로 135', tel: '010-2555-3385', email: 'student05@barun.law' },
  student06: { pw: 'court1234', name: '강바른', org: '진실법률사무소', role: 'student', barNum: '서울20678', addr: '서울 서초구 서초대로 142', tel: '010-2666-3462', email: 'student06@barun.law' },
  student07: { pw: 'court1234', name: '조바른', org: '바른법률사무소', role: 'student', barNum: '서울20791', addr: '서울 서초구 서초대로 149', tel: '010-2777-3539', email: 'student07@barun.law' },
  student08: { pw: 'court1234', name: '윤바른', org: '한결법률사무소', role: 'student', barNum: '서울20904', addr: '서울 서초구 서초대로 156', tel: '010-2888-3616', email: 'student08@barun.law' },
  student09: { pw: 'court1234', name: '장바른', org: '정직법률사무소', role: 'student', barNum: '서울21017', addr: '서울 서초구 서초대로 163', tel: '010-2999-3693', email: 'student09@barun.law' },
  student10: { pw: 'court1234', name: '임바른', org: '신뢰법률사무소', role: 'student', barNum: '서울21130', addr: '서울 서초구 서초대로 170', tel: '010-3110-3770', email: 'student10@barun.law' },
  admin: { pw: 'admin1234', name: '관리자', org: '운영팀', role: 'admin', barNum: '', addr: '', tel: '', email: 'admin@ecourt.kr' },
}

// Checks Supabase accounts table first, falls back to HARDCODED_ACCOUNTS
export async function validateWithSupabase(id: string, pw: string): Promise<User | null> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/accounts?login_id=eq.${encodeURIComponent(id)}&select=*`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    )
    if (res.ok) {
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length > 0) {
        const acc = rows[0]
        if (acc.password !== pw) return null
        return {
          id: acc.login_id,
          name: acc.name,
          org: acc.org || '',
          role: acc.role || 'student',
          barNum: acc.bar_num || '',
          addr: '',
          tel: '',
          email: acc.email || '',
        }
      }
    }
  } catch {
    // fall through to hardcoded
  }
  return validateCredentials(id, pw)
}

export function validateCredentials(id: string, pw: string): User | null {
  const acc = HARDCODED_ACCOUNTS[id]
  if (!acc || acc.pw !== pw) return null
  return {
    id,
    name: acc.name,
    org: acc.org,
    role: acc.role,
    barNum: acc.barNum,
    addr: acc.addr,
    tel: acc.tel,
    email: acc.email,
  }
}

const SESSION_KEY = 'ecfs_session'

export function saveSession(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }
}

export function loadSession(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}
