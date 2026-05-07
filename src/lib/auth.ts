import type { User } from '@/types'
import { SB_URL, SB_KEY, supabase } from '@/lib/supabase'

export interface AccountRecord {
  pw: string
  name: string
  org: string
  role: 'student' | 'admin'
  barNum: string
  barNum2: string
  zipCode: string
  addr: string
  addrDetail: string
  mobile: string
  tel: string
  fax: string
  email: string
  subEmail: string
}

export const HARDCODED_ACCOUNTS: Record<string, AccountRecord> = {
  student01: { pw: 'court1234', name: '김바른', org: '바른법률사무소', role: 'student', barNum: '880101', barNum2: '123456', zipCode: '06594', addr: '서울특별시 서초구 서초대로 107', addrDetail: '바른법률사무소 3층', mobile: '010-2111-3077', tel: '02-3476-3077', fax: '02-3476-3078', email: 'k.barun@barun.law', subEmail: '' },
  student02: { pw: 'court1234', name: '이바른', org: '한결법률사무소', role: 'student', barNum: '880202', barNum2: '234567', zipCode: '06596', addr: '서울특별시 서초구 서초대로 114', addrDetail: '한결법률사무소 5층', mobile: '010-2222-3154', tel: '02-3476-3154', fax: '02-3476-3155', email: 'l.barun@hangyeol.law', subEmail: '' },
  student03: { pw: 'court1234', name: '박바른', org: '정직법률사무소', role: 'student', barNum: '880303', barNum2: '345678', zipCode: '06598', addr: '서울특별시 서초구 서초대로 121', addrDetail: '정직법률사무소 2층', mobile: '010-2333-3231', tel: '02-3476-3231', fax: '02-3476-3232', email: 'p.barun@jeongjik.law', subEmail: '' },
  student04: { pw: 'court1234', name: '최바른', org: '신뢰법률사무소', role: 'student', barNum: '880404', barNum2: '456789', zipCode: '06600', addr: '서울특별시 서초구 서초대로 128', addrDetail: '신뢰법률사무소 4층', mobile: '010-2444-3308', tel: '02-3476-3308', fax: '02-3476-3309', email: 'c.barun@sinroe.law', subEmail: '' },
  student05: { pw: 'court1234', name: '정바른', org: '공정법률사무소', role: 'student', barNum: '880505', barNum2: '567890', zipCode: '06602', addr: '서울특별시 서초구 서초대로 135', addrDetail: '공정법률사무소 6층', mobile: '010-2555-3385', tel: '02-3476-3385', fax: '02-3476-3386', email: 'j.barun@gongjung.law', subEmail: '' },
  student06: { pw: 'court1234', name: '강바른', org: '진실법률사무소', role: 'student', barNum: '880606', barNum2: '678901', zipCode: '06604', addr: '서울특별시 서초구 서초대로 142', addrDetail: '진실법률사무소 7층', mobile: '010-2666-3462', tel: '02-3476-3462', fax: '02-3476-3463', email: 'k.barun@jinsil.law', subEmail: '' },
  student07: { pw: 'court1234', name: '조바른', org: '바른법률사무소', role: 'student', barNum: '880707', barNum2: '789012', zipCode: '06594', addr: '서울특별시 서초구 서초대로 149', addrDetail: '바른법률사무소 8층', mobile: '010-2777-3539', tel: '02-3476-3539', fax: '02-3476-3540', email: 'cho.barun@barun.law', subEmail: '' },
  student08: { pw: 'court1234', name: '윤바른', org: '한결법률사무소', role: 'student', barNum: '880808', barNum2: '890123', zipCode: '06596', addr: '서울특별시 서초구 서초대로 156', addrDetail: '한결법률사무소 9층', mobile: '010-2888-3616', tel: '02-3476-3616', fax: '02-3476-3617', email: 'y.barun@hangyeol.law', subEmail: '' },
  student09: { pw: 'court1234', name: '장바른', org: '정직법률사무소', role: 'student', barNum: '880909', barNum2: '901234', zipCode: '06598', addr: '서울특별시 서초구 서초대로 163', addrDetail: '정직법률사무소 10층', mobile: '010-2999-3693', tel: '02-3476-3693', fax: '02-3476-3694', email: 'jang.barun@jeongjik.law', subEmail: '' },
  student10: { pw: 'court1234', name: '임바른', org: '신뢰법률사무소', role: 'student', barNum: '881010', barNum2: '012345', zipCode: '06600', addr: '서울특별시 서초구 서초대로 170', addrDetail: '신뢰법률사무소 11층', mobile: '010-3110-3770', tel: '02-3476-3770', fax: '02-3476-3771', email: 'lim.barun@sinroe.law', subEmail: '' },
  admin: { pw: 'admin1234', name: '관리자', org: '운영팀', role: 'admin', barNum: '', barNum2: '', zipCode: '', addr: '', addrDetail: '', mobile: '', tel: '', fax: '', email: 'admin@ecourt.kr', subEmail: '' },
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
        // Update last_login_at
        supabase.from('accounts').update({ last_login_at: new Date().toISOString() }).eq('login_id', id).then(() => {})
        return {
          id: acc.login_id,
          name: acc.name,
          org: acc.org || '',
          role: acc.role || 'student',
          barNum: acc.bar_num || '',
          barNum2: acc.bar_num2 || '',
          zipCode: acc.zip_code || '',
          addr: acc.addr || '',
          addrDetail: acc.addr_detail || '',
          mobile: acc.mobile || '',
          tel: acc.tel || '',
          fax: acc.fax || '',
          email: acc.email || '',
          subEmail: acc.sub_email || '',
        }
      }
    }
  } catch {
    // fall through to hardcoded
  }
  return validateCredentials(id, pw)
}

export function validateCredentials(id: string, pw: string): User | null {
  // Check localStorage ec_acc first (accounts added via admin panel)
  if (typeof window !== 'undefined') {
    try {
      const localAccs: Record<string, { password?: string; name?: string; org?: string; role?: string; bar_num?: string; email?: string }> =
        JSON.parse(localStorage.getItem('ec_acc') || '{}')
      if (localAccs[id]) {
        const la = localAccs[id]
        if (la.password !== pw) return null
        return {
          id,
          name: la.name || id,
          org: la.org || '',
          role: (la.role as 'student' | 'admin') || 'student',
          barNum: la.bar_num || '',
          barNum2: '',
          zipCode: '',
          addr: '',
          addrDetail: '',
          mobile: '',
          tel: '',
          fax: '',
          email: la.email || '',
          subEmail: '',
        }
      }
    } catch { /* ignore */ }
  }
  // Fall back to hardcoded accounts
  const acc = HARDCODED_ACCOUNTS[id]
  if (!acc || acc.pw !== pw) return null
  return {
    id,
    name: acc.name,
    org: acc.org,
    role: acc.role,
    barNum: acc.barNum,
    barNum2: acc.barNum2,
    zipCode: acc.zipCode,
    addr: acc.addr,
    addrDetail: acc.addrDetail,
    mobile: acc.mobile,
    tel: acc.tel,
    fax: acc.fax,
    email: acc.email,
    subEmail: acc.subEmail,
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
