'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import LoginModal from '@/components/auth/LoginModal'

const MENUS = [
  { label: '나의전자소송', href: '/mypage' },
  { label: '서류제출', href: '/apply' },
  { label: '각종신청', href: '#' },
  { label: '사건유형별 절차안내', href: '#' },
  { label: '고객센터', href: '#' },
]

export default function GnbNav({ active }: { active?: string }) {
  const { user, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  return (
    <>
      {/* 유틸 바 */}
      <div style={{ background: '#f7f8fa', borderBottom: '1px solid #e0e3ea', height: 34, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 12, color: '#555' }}>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 0 }}>
          {user ? (
            <>
              <span style={{ padding: '0 10px', borderRight: '1px solid #d8dce4', color: '#0067c2', fontWeight: 600 }}>{user.name} 님</span>
              {user.role === 'admin' && (
                <Link href="/admin" style={{ padding: '0 10px', borderRight: '1px solid #d8dce4' }}>관리자</Link>
              )}
              <button onClick={logout} style={{ padding: '0 10px', background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', borderRight: '1px solid #d8dce4' }}>로그아웃</button>
            </>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ padding: '0 10px', background: 'none', border: 'none', fontSize: 12, color: '#0067c2', cursor: 'pointer', fontWeight: 600, borderRight: '1px solid #d8dce4' }}>로그인</button>
          )}
          <span style={{ padding: '0 10px' }}>English</span>
        </div>
        <span style={{ padding: '0 10px' }}>화면크기 + -</span>
      </div>

      {/* GNB */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e0e3ea', position: 'sticky', top: 0, zIndex: 500, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, padding: '0 20px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32, flexShrink: 0 }}>
            <div style={{ width: 44, height: 44, background: '#f0f5fb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '2px solid #c8d8f0' }}>⚖</div>
            <div>
              <div style={{ fontSize: 10, color: '#0067c2', fontWeight: 600 }}>대한민국 법원</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>전자소송포털</div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, height: 64 }}>
            {MENUS.map(m => (
              <Link
                key={m.label}
                href={m.href}
                style={{
                  display: 'flex', alignItems: 'center', padding: '0 18px',
                  fontSize: 14, fontWeight: 600, color: active === m.label ? '#0067c2' : '#222',
                  borderBottom: active === m.label ? '3px solid #0067c2' : '3px solid transparent',
                  whiteSpace: 'nowrap', transition: 'color .15s',
                }}
              >
                {m.label}
              </Link>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link href="/" style={{ fontSize: 12, color: '#555', padding: '6px 10px', borderLeft: '1px solid #eee' }}>🏠 홈</Link>
            <span style={{ fontSize: 12, color: '#555', padding: '6px 10px', borderLeft: '1px solid #eee' }}>🔍</span>
          </div>
        </div>
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
