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
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null)

  return (
    <>
      {/* ── 유틸 바 ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e0e3ea',
        height: 36, display: 'flex', alignItems: 'center',
        padding: '0 20px', fontSize: 12, color: '#555',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0 }}>
          {user ? (
            <>
              <span style={{
                padding: '3px 12px', background: '#f0f0f0', borderRadius: 12,
                color: '#333', fontSize: 12, marginRight: 8,
              }}>
                환영합니다
              </span>
              <span style={{ color: '#0067c2', fontWeight: 600, padding: '0 10px', borderRight: '1px solid #d8dce4' }}>
                {user.name} 님
              </span>
              {user.role === 'admin' && (
                <Link href="/admin" style={{ padding: '0 10px', borderRight: '1px solid #d8dce4', color: '#555', textDecoration: 'none' }}>관리자</Link>
              )}
              <button onClick={logout} style={{ padding: '0 10px', background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', borderRight: '1px solid #d8dce4', fontFamily: 'inherit' }}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <span style={{
                padding: '3px 12px', background: '#f0f0f0', borderRadius: 12,
                color: '#333', fontSize: 12, marginRight: 8,
              }}>
                환영합니다
              </span>
              <button onClick={() => setShowLogin(true)} style={{ padding: '0 10px', background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', borderRight: '1px solid #d8dce4', fontFamily: 'inherit' }}>
                사용자등록
              </button>
              <button onClick={() => setShowLogin(true)} style={{ padding: '0 10px', background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', borderRight: '1px solid #d8dce4', fontFamily: 'inherit' }}>
                로그인
              </button>
            </>
          )}
          <span style={{ padding: '0 10px', borderRight: '1px solid #d8dce4' }}>English</span>
          <span style={{ padding: '0 10px' }}>화면크기 + -</span>
        </div>
      </div>

      {/* ── GNB ── */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #e0e3ea',
        position: 'sticky', top: 0, zIndex: 500,
        boxShadow: '0 1px 4px rgba(0,0,0,.08)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', height: 70, padding: '0 20px' }}>

          {/* 로고 */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 40, flexShrink: 0, textDecoration: 'none' }}>
            {/* 법원 심볼 */}
            <div style={{ position: 'relative', width: 50, height: 50 }}>
              <div style={{
                width: 50, height: 50, background: 'linear-gradient(135deg, #003087, #0067c2)',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 24,
              }}>
                ⚖
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#0067c2', fontWeight: 600, letterSpacing: 1 }}>대한민국 법원</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', letterSpacing: -0.5 }}>전자소송포털</div>
            </div>
          </Link>

          {/* 메뉴 */}
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, height: 70 }}>
            {MENUS.map(m => (
              <Link
                key={m.label}
                href={m.href}
                onMouseEnter={() => setHoveredMenu(m.label)}
                onMouseLeave={() => setHoveredMenu(null)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '0 20px',
                  fontSize: 15, fontWeight: 600,
                  color: active === m.label || hoveredMenu === m.label ? '#003087' : '#1a1a2e',
                  borderBottom: active === m.label ? '3px solid #003087' : '3px solid transparent',
                  whiteSpace: 'nowrap', textDecoration: 'none',
                  transition: 'color .15s, border-bottom-color .15s',
                }}
              >
                {m.label}
              </Link>
            ))}
          </div>

          {/* 우측 아이콘 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 20, color: '#333' }}>
              🔍
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 20, color: '#333' }}>
              ☰
            </button>
          </div>
        </div>
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
