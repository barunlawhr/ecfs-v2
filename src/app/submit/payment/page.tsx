'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MockBar from '@/components/layout/MockBar'
import GnbNav from '@/components/layout/GnbNav'
import Footer from '@/components/layout/Footer'
import SubmitSidebar from '@/components/layout/SubmitSidebar'
import { useAuth } from '@/context/AuthContext'
import LoginModal from '@/components/auth/LoginModal'

const S = '#'

const FREQUENT = [
  { label: '지급명령신청서', href: S },
  { label: '주소보정서(제소신청, 공시송달신청)', href: S },
  { label: '보정서(임의보정)', href: S },
  { label: '보정서(보정명령에 의한 보정)', href: S },
  { label: '이의신청에 따른 인지액·송달료 보정서', href: S },
  { label: '소송절차회부결정에 따른 인지액·송달료 보정서', href: S },
  { label: '청구취지 변경신청', href: S },
  { label: '청구원인 변경신청', href: S },
  { label: '청구취지 및 청구원인 변경신청', href: S },
  { label: '지급명령신청 (일부)취하서', href: S },
  { label: '당사자표시 정정신청', href: S },
  { label: '지급명령에 대한 이의신청서', href: S },
]

const SECTIONS = [
  {
    title: '지급명령신청 관련',
    note: null,
    items: [{ label: '지급명령신청서', href: S }],
  },
  {
    title: '지급명령 청구취지 관련',
    note: '※ 청구의 변경 및 점점 관련 서류',
    items: [
      { label: '청구취지 및 청구원인인 변경신청서', href: S },
      { label: '청구취지 변경신청서', href: S },
      { label: '청구원인 변경신청서', href: S },
    ],
  },
  {
    title: '지급명령 보정서/송달 관련',
    note: '※ 각종 보정 및 송달 관련 서류',
    items: [
      { label: '송달장소 및 송달명수인 신고서', href: S },
      { label: '주소/송달장소 변경신고서', href: S },
      { label: '주소보정서(제소신청, 공시송달신청)', href: S },
      { label: '보정서(임의보정)', href: S },
      { label: '보정서(보정명령에 의한 보정)', href: S },
      { label: '인지액·송달료 보정서', href: S },
      { label: '이의신청에 따른 인지액·송달료 보정서', href: S },
      { label: '소송절차회부결정에 따른 인지액·송달료 보정서', href: S },
      { label: '조정으로의 이행신청에 따른 송달료 보정서', href: S },
      { label: '송달료 예납처리 신청서', href: S },
    ],
  },
  {
    title: '지급명령 당사자 관련',
    note: '※ 당사자 관련 서류',
    items: [
      { label: '당사자표시 정정신청서', href: S },
      { label: '소송절차수계신청서', href: S },
      { label: '개인정보정정신청서', href: S },
    ],
  },
  {
    title: '지급명령 소송대리 관련',
    note: '※ 소송에 관한 위임 및 대리인 지정에 관한 서류',
    items: [
      { label: '소송위임장', href: S },
      { label: '소송대리인 해임신고서', href: S },
      { label: '소송대리인 사임신고서', href: S },
    ],
  },
  {
    title: '지급명령 절차 관련',
    note: '※ 독촉절차 관련 각종 서류',
    items: [
      { label: '결정경정신청서', href: S },
      { label: '답변서(청구취지/원인)', href: S },
      { label: '사법보좌관의 처분에 대한 이의신청서', href: S },
      { label: '지급명령에 대한 이의신청서', href: S },
      { label: '사법보좌관 처분에 대한 이의신청 취하서', href: S },
      { label: '지급명령에 대한 이의신청 취하서', href: S },
      { label: '지급명령신청 (일부)취하서', href: S },
      { label: '조정으로의 이행신청서', href: S },
      { label: '즉시항고장', href: S },
      { label: '특별항고장', href: S },
    ],
  },
  {
    title: '지급명령 기타',
    note: null,
    items: [
      { label: '인지환급및과오납금반환 대표청구인 신고서', href: S },
      { label: '소송등 인지의 과오납금 반환청구서', href: S },
      { label: '소명자료제출', href: S },
      { label: '장애인 사법지원 신청서', href: S },
      { label: '장애인을 위한 통역 안내(답변)', href: S },
    ],
  },
  {
    title: "일반 독촉사건('차')관련",
    note: "※ 일반 독촉사건(사건번호 '차')에 대한 서류를 전자적으로 제출",
    items: [{ label: "일반 독촉사건('차')기타", href: S }],
  },
]

const TABS = [
  { label: '민사 본안', href: '/submit/civil' },
  { label: '민사 신청', href: '/submit/petition' },
  { label: '지급명령(독촉)신청', href: '/submit/payment' },
  { label: '전체 서류', href: '/submit/all' },
]

export default function PaymentPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [search, setSearch] = useState('')

  const go = (href: string) => {
    if (href === S) { alert('실습 모드에서는 지원되지 않습니다.'); return }
    router.push(href)
  }

  const docLink = (label: string, href: string) => (
    <button key={label + href} onClick={() => go(href)} style={{
      background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
      color: '#333', padding: '3px 0', textAlign: 'left', fontFamily: 'inherit',
      display: 'flex', alignItems: 'flex-start', gap: 6,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0067c2' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333' }}
    >
      <span style={{ color: '#0067c2', fontSize: 11, marginTop: 2, flexShrink: 0 }}>•</span>{label}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa', fontFamily: 'AppleSDGothicNeo, Malgun Gothic, sans-serif' }}>
      <MockBar />
      <GnbNav active="서류제출" />

      <div style={{ flex: 1, maxWidth: 1160, margin: '0 auto', width: '100%', padding: '0 20px', display: 'flex', gap: 0 }}>
        <SubmitSidebar active="지급명령(독촉)신청" />

        <div style={{ flex: 1, padding: '20px 28px', minWidth: 0 }}>
          {/* 브레드크럼 */}
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span>홈</span><span>›</span><span>서류제출</span><span>›</span><span>민사서류</span><span>›</span>
            <span style={{ color: '#003087', fontWeight: 600 }}>지급명령(독촉)신청</span>
          </div>

          {/* 제목 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#0067c2', fontSize: 16 }}>●</span> 지급명령(독촉)신청
            </h1>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ fontSize: 12, border: '1px solid #ccc', background: '#fff', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', color: '#555' }}>나의 메뉴 추가</button>
              <button style={{ fontSize: 12, border: '1px solid #ccc', background: '#fff', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', color: '#555' }}>출력</button>
            </div>
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', marginBottom: 18, borderBottom: '2px solid #003087' }}>
            {TABS.map(tab => (
              <button key={tab.label} onClick={() => router.push(tab.href)} style={{
                padding: '9px 22px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', marginRight: 2, borderRadius: '4px 4px 0 0',
                background: tab.href === '/submit/payment' ? '#003087' : '#e8edf4',
                color: tab.href === '/submit/payment' ? '#fff' : '#555',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* 안내 */}
          <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', borderRadius: 4, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#444', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <span>법원을 방문하여 종이로 제출하던 <strong>지급명령신청</strong> 서류를 <strong>인터넷</strong>으로 제출합니다.</span>
          </div>

          {/* 자주 찾는 서류 */}
          <section style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#e6a817' }}>○</span> 자주 찾는 지급명령(독촉) 신청 서류
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px 8px' }}>
              {FREQUENT.map(f => docLink(f.label, f.href))}
            </div>
            <div style={{ fontSize: 12, color: '#0067c2', textAlign: 'right', marginTop: 8 }}>
              ■ 표시가 있는 문서는 표준화된 입력항목을 직접 작성하는 전자문서 입니다.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="아래 서류명을 입력하세요."
                style={{ flex: 1, border: '1px solid #ccc', borderRadius: 3, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit' }} />
              <button style={{ background: '#3a6bbf', color: '#fff', border: 'none', borderRadius: 3, padding: '7px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                🔍 서류명검색
              </button>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #dde3ed', marginBottom: 16 }} />

          {SECTIONS.map(sec => (
            <section key={sec.title} style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px 0', paddingBottom: 6, borderBottom: '1px solid #dde3ed' }}>
                {sec.title}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px 8px' }}>
                {sec.items.map(item => docLink(item.label, item.href))}
              </div>
              {sec.note && <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0 0' }}>{sec.note}</p>}
            </section>
          ))}
        </div>
      </div>

      <Footer />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
