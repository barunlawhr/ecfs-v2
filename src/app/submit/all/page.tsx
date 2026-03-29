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

// 전체 서류 = 민사본안 + 민사신청 + 지급명령 섹션 모두
const FREQUENT = [
  { label: '소장', href: APPLY }, { label: '답변서(청구취지/원인)', href: S },
  { label: '준비서면', href: S }, { label: '민사가압류신청서', href: S },
  { label: '지급명령신청서', href: S }, { label: '항소장', href: S },
]

const SECTIONS = [
  // ── 민사본안 ──
  {
    title: '소제기 관련',
    note: null,
    items: [
      { label: '소장', href: APPLY }, { label: '반소장', href: S },
      { label: '독립당사자참가신청서', href: S }, { label: '조정신청서', href: S },
      { label: '화해신청서', href: S },
    ],
  },
  {
    title: '주요서면',
    note: '※ 소장처럼 작성 후에 제출해야 하는 서류',
    items: [
      { label: '준비서면', href: S }, { label: '변론요지서', href: S },
      { label: '독립당사자참가신청서', href: S }, { label: '반소장', href: S },
      { label: '조정신청서', href: S }, { label: '참고서면', href: S },
      { label: '기일내참고서면(증거자료 포함)', href: S },
    ],
  },
  {
    title: '증거신청 관련',
    note: null,
    items: [
      { label: '서증', href: S }, { label: '증거목록', href: S },
      { label: '증인신청서', href: S }, { label: '감정신청서', href: S },
      { label: '당사자신청서', href: S }, { label: '문서제출명령신청서', href: S },
      { label: '당사자의 대리인 사실조회신청서', href: S },
      { label: '증인에 대한 서면심문신청서', href: S },
      { label: '증거보전신청서', href: S }, { label: '감정사항목록', href: S },
      { label: '감정보완신청서', href: S }, { label: '감정인 기피신청서', href: S },
      { label: '변론준비절차 주장서면', href: S }, { label: '증거의견서', href: S },
      { label: '수명법관의 처분에 대한 이의신청서', href: S }, { label: '증인 변경 신청서', href: S },
    ],
  },
  {
    title: '참고자료 관련',
    note: '※ 참고자료 변론 서류',
    items: [{ label: '참고자료 변론 신청서', href: S }, { label: '참고자료 문서', href: S }],
  },
  {
    title: '보정/송달 관련',
    note: null,
    items: [
      { label: '주소보정서(특별송달,공시송달,봉인집행신청,주소불명이전송달신청서)', href: S },
      { label: '공시송달신청서', href: S }, { label: '보정서', href: S },
      { label: '보정서(가처분)', href: S }, { label: '반송달확인신청서', href: S },
      { label: '송달장소변경신고서', href: S }, { label: '보관중인서류 수령확인서', href: S },
      { label: '영치동의서', href: S },
    ],
  },
  {
    title: '당사자 관련',
    note: '※ 당사자표시와 관련한 서류',
    items: [
      { label: '당사자표시변경신청서', href: S }, { label: '피고경정신청서', href: S },
      { label: '소송참가신청서', href: S }, { label: '소송고지신청서', href: S },
      { label: '소송탈퇴신청서', href: S }, { label: '당사자변경신청서', href: S },
    ],
  },
  {
    title: '소송대리 관련',
    note: null,
    items: [
      { label: '소송위임장', href: S }, { label: '소송행위추인서', href: S },
      { label: '소송대리허가신청', href: S }, { label: '소송대리허가취소신청', href: S },
      { label: '소송대리권수여신고', href: S }, { label: '사무직원특별위임장', href: S },
    ],
  },
  {
    title: '기일 및 변론 관련',
    note: '※ 기타 기일관련 서류',
    items: [{ label: '기일변경신청서', href: S }, { label: '기일지정신청서', href: S }],
  },
  {
    title: '기일 및 진행관련 신청',
    note: null,
    items: [{ label: '소송촉진요청서', href: S }],
  },
  {
    title: '증거관련 확인통보',
    note: null,
    items: [
      { label: '사실조회신청서', href: S }, { label: '검증신청서', href: S },
      { label: '감정신청서', href: S }, { label: '문서송부촉탁신청서', href: S },
      { label: '조사촉탁신청서', href: S }, { label: '당사자조회신청서', href: S },
    ],
  },
  {
    title: '재판확인 관련',
    note: '※ 아래 재판확인관련 서류',
    items: [
      { label: '소장', href: APPLY }, { label: '소장(간이절차)', href: S },
      { label: '소취하서', href: S }, { label: '소장에 갈음하는 화해신청서', href: S },
      { label: '기타서류', href: S }, { label: '소송대리허가신청 및 소송위임장', href: S },
      { label: '청구취지 및 청구원인변경신청서', href: S },
      { label: '조정에 갈음하는 결정에 대한 이의신청서', href: S },
      { label: '화해권고결정에 대한 이의신청서', href: S },
      { label: '답변서(청구취지/원인)', href: S }, { label: '이의신청서', href: S },
      { label: '답변서', href: S },
    ],
  },
  {
    title: '항소 관련',
    note: null,
    items: [
      { label: '항소장', href: S }, { label: '항소취하서', href: S },
      { label: '항소이유서', href: S }, { label: '부대항소장', href: S },
      { label: '항소이유서 제출기간 연장신청서', href: S }, { label: '항고장', href: S },
      { label: '재항고장', href: S }, { label: '즉시항고장', href: S },
      { label: '특별항고장', href: S }, { label: '재심소장', href: S },
    ],
  },
  {
    title: '기타(본안)',
    note: null,
    items: [
      { label: '판사면제신청(포기/청구포기·인낙·화해에 관한 연명신고서)', href: S },
      { label: '소송비용의 부담에 관한 제소확인신청 및 관련서류', href: S },
      { label: '기타', href: S },
    ],
  },
  // ── 민사신청 ──
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
      { label: '주택임차권등기명령에 대한 이의신청서', href: S },
      { label: '상가임차권 등기명령에 대한 이의신청서', href: S },
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
      { label: '특별대리인신임 신청서', href: S }, { label: '소송비용 담보제공 신청서', href: S },
      { label: '담보취소 신청서', href: S }, { label: '소송구조 신청서', href: S },
      { label: '소송구조 취소신청서', href: S }, { label: '판결경정신청서', href: S },
      { label: '결정경정신청서', href: S }, { label: '증거보전신청서', href: S },
      { label: '강제집행정지 신청서', href: S }, { label: '위한제청 신청서', href: S },
      { label: '준재심신청서(결정,명령)', href: S },
    ],
  },
  {
    title: '신청 관련 문건',
    note: '※ 각종 신청관련 문건 서류',
    items: [
      { label: '신청취지 및 신청이유 변경신청서', href: S }, { label: '신청취지 변경신청서', href: S },
      { label: '신청이유 변경신청서', href: S }, { label: '답변서(각종신청)', href: S },
      { label: '신청취하서', href: S }, { label: '신청일부취하서', href: S },
      { label: '집행해제(취소) 신청서', href: S }, { label: '등기촉탁신청서', href: S },
      { label: '진술서', href: S }, { label: '미사용신청서', href: S },
      { label: '임차권 등기명령 해제신청서', href: S }, { label: '제소고지서', href: S },
      { label: '사법보좌관의 처분에 대한 이의신청서', href: S },
      { label: '사법보좌관 처분에 대한 이의신청 취하서', href: S },
    ],
  },
  // ── 지급명령 ──
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
      { label: '청구취지 변경신청서', href: S }, { label: '청구원인 변경신청서', href: S },
    ],
  },
  {
    title: '지급명령 보정서/송달 관련',
    note: '※ 각종 보정 및 송달 관련 서류',
    items: [
      { label: '송달장소 및 송달명수인 신고서', href: S },
      { label: '주소보정서(제소신청, 공시송달신청)', href: S },
      { label: '보정서(임의보정)', href: S }, { label: '보정서(보정명령에 의한 보정)', href: S },
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
      { label: '소송절차수계신청서', href: S }, { label: '개인정보정정신청서', href: S },
    ],
  },
  {
    title: '지급명령 소송대리 관련',
    note: '※ 소송에 관한 위임 및 대리인 지정에 관한 서류',
    items: [
      { label: '소송위임장', href: S }, { label: '소송대리인 해임신고서', href: S },
      { label: '소송대리인 사임신고서', href: S },
    ],
  },
  {
    title: '지급명령 절차 관련',
    note: '※ 독촉절차 관련 각종 서류',
    items: [
      { label: '결정경정신청서', href: S }, { label: '답변서(청구취지/원인)', href: S },
      { label: '사법보좌관의 처분에 대한 이의신청서', href: S },
      { label: '지급명령에 대한 이의신청서', href: S },
      { label: '지급명령신청 (일부)취하서', href: S },
      { label: '조정으로의 이행신청서', href: S },
      { label: '즉시항고장', href: S }, { label: '특별항고장', href: S },
    ],
  },
  {
    title: '지급명령 기타',
    note: null,
    items: [
      { label: '인지환급및과오납금반환 대표청구인 신고서', href: S },
      { label: '소송등 인지의 과오납금 반환청구서', href: S }, { label: '소명자료제출', href: S },
      { label: '장애인 사법지원 신청서', href: S },
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

export default function AllDocsPage() {
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
        <SubmitSidebar active="전체서류" />

        <div style={{ flex: 1, padding: '20px 28px', minWidth: 0 }}>
          {/* 브레드크럼 */}
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span>홈</span><span>›</span><span>서류제출</span><span>›</span><span>민사서류</span><span>›</span>
            <span style={{ color: '#003087', fontWeight: 600 }}>전체서류</span>
          </div>

          {/* 제목 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#0067c2', fontSize: 16 }}>●</span> 전체서류
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
                background: tab.href === '/submit/all' ? '#003087' : '#e8edf4',
                color: tab.href === '/submit/all' ? '#fff' : '#555',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* 안내 */}
          <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', borderRadius: 4, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#444', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <span>민사 관련 <strong>전체 서류 목록</strong>을 확인하고 전자적으로 제출할 수 있습니다.</span>
          </div>

          {/* 자주 찾는 서류 */}
          <section style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#e6a817' }}>○</span> 자주 찾는 민사 전체 서류
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
