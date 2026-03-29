'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const CIVIL_ITEMS = [
  { label: '민사본안', href: '/submit/civil' },
  { label: '민사신청', href: '/submit/petition' },
  { label: '지급명령(독촉)신청', href: '/submit/payment' },
  { label: '전체서류', href: '/submit/all' },
]

const COLLAPSED_MENUS = [
  '형사서류', '가사서류', '보호서류', '회생파산서류', '민사집행서류',
]
const PLAIN_MENUS = ['행정서류', '특허서류', '비송,과태료 서류', '회신서등 제출']

export default function SubmitSidebar({ active }: { active: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [civilOpen, setCivilOpen] = useState(true)

  const go = (href: string) => {
    if (href === '#') { alert('실습 모드에서는 지원되지 않습니다.'); return }
    router.push(href)
  }

  const sidebarBg = '#f7f9fc'
  const borderColor = '#dde3ed'

  return (
    <div style={{ width: 170, flexShrink: 0, borderRight: `1px solid ${borderColor}`, background: sidebarBg, minHeight: 600 }}>
      {/* 서류제출 버튼 */}
      <div style={{ background: '#1a4ea0', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 0', textAlign: 'center', letterSpacing: -0.3, cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <span style={{ fontSize: 13 }}>◀</span> 서류제출
      </div>

      {/* 서류검색 */}
      <div
        onClick={() => go('/submit/civil')}
        style={{ padding: '10px 16px', fontSize: 13, color: '#333', cursor: 'pointer', borderBottom: `1px solid ${borderColor}`, background: '#fff' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0067c2' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333' }}
      >
        서류검색
      </div>

      {/* 민사서류 (expanded) */}
      <div>
        <div
          onClick={() => setCivilOpen(o => !o)}
          style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#1a4ea0', cursor: 'pointer', borderBottom: `1px solid ${borderColor}`, background: '#eef3fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>민사서류</span>
          <span style={{ fontSize: 11 }}>{civilOpen ? '∧' : '∨'}</span>
        </div>
        {civilOpen && (
          <div style={{ background: '#fff', borderBottom: `1px solid ${borderColor}` }}>
            {CIVIL_ITEMS.map(item => (
              <div
                key={item.label}
                onClick={() => go(item.href)}
                style={{
                  padding: '7px 16px 7px 24px', fontSize: 12, cursor: 'pointer',
                  color: active === item.label ? '#0067c2' : '#444',
                  fontWeight: active === item.label ? 700 : 400,
                  background: active === item.label ? '#e8f0fb' : 'transparent',
                  borderLeft: active === item.label ? '3px solid #0067c2' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (active !== item.label) (e.currentTarget as HTMLElement).style.color = '#0067c2' }}
                onMouseLeave={e => { if (active !== item.label) (e.currentTarget as HTMLElement).style.color = '#444' }}
              >
                · {item.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 나머지 메뉴들 */}
      {COLLAPSED_MENUS.map(m => (
        <div
          key={m}
          style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#333', cursor: 'pointer', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0067c2' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333' }}
        >
          <span>{m}</span><span style={{ fontSize: 11 }}>∨</span>
        </div>
      ))}
      {PLAIN_MENUS.map(m => (
        <div
          key={m}
          style={{ padding: '10px 16px', fontSize: 13, color: '#333', cursor: 'pointer', borderBottom: `1px solid ${borderColor}` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0067c2' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333' }}
        >
          {m}
        </div>
      ))}
    </div>
  )
}
