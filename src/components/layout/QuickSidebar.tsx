'use client'

import { useState } from 'react'

const SECTIONS = [
  {
    title: '이용안내',
    items: [
      { label: '전자소송도움말' },
      { label: '문제해결안내' },
      { label: '자주하는 질문' },
      { label: '원격지원 서비스' },
    ],
  },
  {
    title: '부기능',
    items: [
      { label: '관할법원찾기' },
      { label: '소송비용계산' },
      { label: '부동산가액 및 소가계산기' },
      { label: '손해배상등 계산 프로그램' },
      { label: '사건검색' },
      { label: '사건구분안내' },
      { label: '종합법률정보' },
      { label: '양식모음' },
    ],
  },
]

export default function QuickSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 900,
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {/* ── 바로가기 탭 버튼 (왼쪽에 붙음) ── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: 26,
          minHeight: 90,
          background: '#1a4a8a',
          border: 'none',
          borderRadius: '6px 0 0 6px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          color: '#fff',
          boxShadow: '-3px 0 10px rgba(0,0,0,0.18)',
          flexShrink: 0,
          padding: '10px 0',
        }}
        title={open ? '닫기' : '바로가기'}
      >
        {'바로가기'.split('').map((ch, i) => (
          <span
            key={i}
            style={{
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1.3,
              fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif",
              letterSpacing: 0,
            }}
          >
            {ch}
          </span>
        ))}
        <span style={{ fontSize: 8, marginTop: 6, opacity: 0.85 }}>
          {open ? '▶' : '◀'}
        </span>
      </button>

      {/* ── 슬라이드 패널 (오른쪽으로 펼쳐짐) ── */}
      <div
        style={{
          width: open ? 190 : 0,
          overflow: 'hidden',
          transition: 'width 0.22s ease',
          background: '#fff',
          borderTop: '1px solid #c8d6e8',
          borderBottom: '1px solid #c8d6e8',
          borderLeft: open ? '1px solid #c8d6e8' : 'none',
          boxShadow: open ? '2px 4px 16px rgba(0,0,0,0.13)' : 'none',
        }}
      >
        <div style={{ width: 190 }}>
          {SECTIONS.map((section, si) => (
            <div key={si}>
              {/* 섹션 헤더 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 12px 6px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#0056b3',
                  background: '#f4f8fd',
                  borderBottom: '1px solid #dce8f5',
                  borderTop: si > 0 ? '1px solid #dce8f5' : 'none',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '1.5px solid #0056b3',
                  fontSize: 9,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  i
                </span>
                {section.title}
              </div>

              {/* 아이템 */}
              {section.items.map((item, ii) => (
                <button
                  key={ii}
                  onClick={() => alert('실습 모드에서는 지원되지 않습니다.')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 14px',
                    fontSize: 12,
                    color: '#333',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #f0f4f9',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#eaf2fb'
                    el.style.color = '#003087'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'none'
                    el.style.color = '#333'
                  }}
                >
                  <span>{item.label}</span>
                  <span style={{ color: '#aab', fontSize: 11, flexShrink: 0 }}>›</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
