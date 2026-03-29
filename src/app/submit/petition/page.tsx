'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MockBar from '@/components/layout/MockBar'
import GnbNav from '@/components/layout/GnbNav'
import Footer from '@/components/layout/Footer'
import SubmitSidebar from '@/components/layout/SubmitSidebar'
import { useAuth } from '@/context/AuthContext'
import LoginModal from '@/components/auth/LoginModal'

const APPLY = '/apply?new=true'
const S = '#'

const FREQUENT = [
  { label: '민사가압류신청서', href: S },
  { label: '민사가처분신청서', href: S },
  { label: '주택임차권등기명령신청서', href: S },
  { label: '판결경정신청서', href: S },
  { label: '결정경정신청서', href: S },
  { label: '담보취소신청서', href: S },
  { label: '특별대리인신임 신청서', href: S },
  { label: '관리행사최고 및 담보취소 신청서', href: S },
  { label: '소송구조신청서', href: S },
  { label: '소송비용액확정 신청서', href: S },
  { label: '제소전화해 신청서', href: S },
  { label: '공시최고신청서', href: S },
]

const SECTIONS = [
  {
    title: '보전처분 관련 신청',
    note: '※ 각종 보전처분관련 신청 서류',
    items: [
      { label: '민사 가압류신청서', href: S }, { label: '신청 가처분신청서', href: S },
      { label: '주택임차권 등기명령 신청서', href: S }, { label: '상가임차권 등기명령 신청서', href: S },
      { label: '제소명령신청서', href: S }, { label: '가압류 이의신청서', href: S },
      { label: '가처분 이의신청서', href: S }, { label: '가압류 취소신청서', href: S },
      { label: '가처분 취소신청서', href: S },
      { label: '해방공탁액 의한 가압류집행취소신청서', href: S },
      { label: '선박 감수·보존처분 신청서', href: S },
      { label: '주택임차권등기명령에 대한 이의신청서', href: S },
      { label: '상가임차권 등기명령에 대한 이의신청서', href: S },
      { label: '주택임차권등기명령에 대한 취소신청서', href: S },
      { label: '상가임차권 등기명령에 대한 취소신청서', href: S },
      { label: '기타', href: S },
    ],
  },
  {
    title: '기타 신청',
    note: '※ 기타 신청 서류',
    items: [
      { label: '제소전화해 신청서', href: S },
      { label: '의사표시의 공시송달 신청서', href: S },
      { label: '공시최고신청서', href: S },
    ],
  },
  {
    title: '본안 관련 신청',
    note: '※ 각종 본안관련 신청 서류',
    items: [
      { label: '관할법원지정 신청서', href: S }, { label: '소송이송신청서', href: S },
      { label: '법관, 직원에 대한 제척 신청서', href: S }, { label: '기피신청서', href: S },
      { label: '특별대리인신임 신청서', href: S }, { label: '제3자에 대한 소송비용액환정 신청서', href: S },
      { label: '소송비용 부담 및 확정 신청서', href: S }, { label: '소송비용 담보제공 신청서', href: S },
      { label: '담보취소 신청서', href: S }, { label: '담보관리행사최고신청서', href: S },
      { label: '권리행사최고 및 담보취소신청서', href: S }, { label: '담보변경 신청서', href: S },
      { label: '소송구조 신청서', href: S }, { label: '소송구조 취소신청서', href: S },
      { label: '변호사, 집행관 보수, 채담금의 비용액 확정 신청서', href: S },
      { label: '재판기록 열람 등 제한결정 신청서', href: S },
      { label: '재판기록 열람 등 제한결정 취소신청서', href: S },
      { label: '비밀보호를 위한 판결서 열람 등 제한신청서', href: S },
      { label: '비밀유지명령 신청서', href: S },
      { label: '판결서 열람 등 제한결정 취소신청서', href: S },
      { label: '판결경정신청서', href: S }, { label: '결정경정신청서', href: S },
      { label: '법원사무관등 처분에 대한 이의신청서', href: S },
      { label: '증거보전신청서', href: S }, { label: '강제집행정지 신청서', href: S },
      { label: '조정사건 이송신청서', href: S }, { label: '위한제청 신청서', href: S },
      { label: '조정조서경정 신청서', href: S }, { label: '준재심신청서(결정,명령)', href: S },
    ],
  },
  {
    title: '신청 관련 문건',
    note: '※ 각종 신청관련 문건 서류',
    items: [
      { label: '신청취지 및 신청이유 변경신청서', href: S }, { label: '신청취지 변경신청서', href: S },
      { label: '신청이유 변경신청서', href: S }, { label: '답변서(각종신청)', href: S },
      { label: '신청취하서', href: S }, { label: '신청일부취하서', href: S },
      { label: '집행해제(취소) 신청서', href: S }, { label: '신청취하 및 집행해제(채무자 등)', href: S },
      { label: '일부 집행취소(해제) 신청서', href: S },
      { label: '일부 신청취하 및 집행해제 신청서', href: S },
      { label: '신청취하 및 집행해제 신청서', href: S },
      { label: '권리신고서(공시최고에 대한)', href: S },
      { label: '진술최고신청서(제3채무자에 대한)', href: S }, { label: '등기촉탁신청서', href: S },
      { label: '진술서', href: S }, { label: '제3채무자 진술서', href: S },
      { label: '가압류신청 진술서', href: S }, { label: '미사용신청서', href: S },
      { label: '임차권 등기명령 해제신청서', href: S }, { label: '해방봉심에 대한 소제기신청서', href: S },
      { label: '화제조항', href: S }, { label: '제3채무자의 관리공탁 신고서', href: S },
      { label: '제소고지서', href: S }, { label: '보정서(등록세,등기수수료,송달료)', href: S },
      { label: '등기신청수수료 환급신청서', href: S }, { label: '등록관청의 동의서', href: S },
      { label: '담보취소결정에 대한 항고관보고서', href: S }, { label: '등록관청의 수리통지서', href: S },
      { label: '등록관청의 불수리통지서', href: S }, { label: '등록관청의 보정통지서', href: S },
      { label: '사법보좌관의 처분에 대한 이의신청서', href: S },
      { label: '사법보좌관 처분에 대한 이의신청 취하서', href: S },
    ],
  },
]

const TABS = [
  { label: '민사 본안', href: '/submit/civil' },
  { label: '민사 신청', href: '/submit/petition' },
  { label: '지급명령(독촉)신청', href: '/submit/payment' },
  { label: '전체 서류', href: '/submit/all' },
]

export default function PetitionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [search, setSearch] = useState('')

  const go = (href: string) => {
    if (href === S) { alert('실습 모드에서는 지원되지 않습니다.'); return }
    if (!user && href === APPLY) { setShowLogin(true); return }
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
        <SubmitSidebar active="민사신청" />

        <div style={{ flex: 1, padding: '20px 28px', minWidth: 0 }}>
          {/* 브레드크럼 */}
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span>홈</span><span>›</span><span>서류제출</span><span>›</span><span>민사서류</span><span>›</span>
            <span style={{ color: '#003087', fontWeight: 600 }}>민사신청</span>
          </div>

          {/* 제목 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#0067c2', fontSize: 16 }}>●</span> 민사신청
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
                background: tab.href === '/submit/petition' ? '#003087' : '#e8edf4',
                color: tab.href === '/submit/petition' ? '#fff' : '#555',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* 안내 */}
          <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', borderRadius: 4, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#444', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <span>민사 보전처분 및 본안관련 <strong>신청사건</strong>의 신청서를 <strong>전자적</strong>으로 제출합니다.</span>
          </div>

          {/* 자주 찾는 서류 */}
          <section style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#e6a817' }}>○</span> 자주 찾는 민사신청 서류
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
