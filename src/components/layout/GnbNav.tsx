'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import LoginModal from '@/components/auth/LoginModal'

/* ─────────────────────────────────────
   메가 메뉴 데이터
───────────────────────────────────── */
type MenuItem = { label: string; href: string }
type MenuGroup = { title: string; items: MenuItem[] }
type MegaMenu = { groups: MenuGroup[]; image: string; columns?: MenuGroup[][] }

const MEGA: Record<string, MegaMenu> = {
  '나의전자소송': {
    image: '🧑‍💻',
    groups: [],
    columns: [
      // 열 0
      [
        { title: '나의사건현황', items: [] },
        { title: '나의사건관리', items: [
          { label: '진행중사건', href: '/mypage' },
          { label: '관심사건', href: '/mypage' },
          { label: '확정된사건', href: '/mypage' },
          { label: '완료된사건', href: '/mypage' },
        ]},
        { title: '사건진행', items: [
          { label: '재판일정', href: '/mypage' },
          { label: '대조형 쟁점요약', href: '#' },
          { label: '사건별게시판', href: '#' },
          { label: '문서송부확인', href: '#' },
          { label: '서증인부(문서송부)', href: '#' },
          { label: '보정/미보정내역(독촉)', href: '#' },
          { label: '증거의견입력', href: '#' },
        ]},
      ],
      // 열 1
      [
        { title: '국선전담사건', items: [
          { label: '처리내역관리', href: '#' },
          { label: '보고된사건조회', href: '#' },
        ]},
        { title: '나의문서함', items: [
          { label: '작성중서류', href: '/apply' },
          { label: '제출서류', href: '/mypage' },
          { label: '미확인송달문서', href: '/mypage' },
          { label: '전체송달문서', href: '/mypage' },
          { label: '송달문서 정(등)본발급', href: '#' },
        ]},
      ],
      // 열 2
      [
        { title: '납부/환급관리', items: [
          { label: '소송비용납부', href: '#' },
          { label: '상소비용예납', href: '#' },
          { label: '전자납부내역', href: '#' },
          { label: '가상계좌내역', href: '#' },
          { label: '송달료 자동납부내역', href: '#' },
          { label: '대표청구인 신고', href: '#' },
          { label: '인지액환급청구', href: '#' },
          { label: '과오납금반환청구', href: '#' },
        ]},
        { title: '기록 열람', items: [
          { label: '나의사건열람', href: '#' },
          { label: '형사전자사본화사건열람', href: '#' },
        ]},
      ],
      // 열 3
      [
        { title: '전자소송사건등록', items: [
          { label: '전자소송사건등록', href: '#' },
          { label: '형사전자사본화사건등록', href: '#' },
        ]},
        { title: '맞춤형문서함', items: [
          { label: '파산관재인 사건 관리', href: '#' },
          { label: '제출문서 반려의견', href: '#' },
          { label: '채권정보조회', href: '#' },
          { label: '사실조회기관회신', href: '#' },
          { label: '상담의견교환', href: '#' },
          { label: '제3채무자', href: '#' },
          { label: '오픈API 제출내역', href: '#' },
        ]},
        { title: '나의정보관리', items: [] },
      ],
    ],
  },

  '서류제출': {
    image: '📱',
    groups: [
      { title: '서류검색', items: [] },
      { title: '민사서류', items: [
        { label: '민사본안', href: '/apply' },
        { label: '민사신청', href: '/apply' },
        { label: '지급명령(독촉)신청', href: '/apply' },
        { label: '전체서류', href: '/apply' },
      ]},
      { title: '형사서류', items: [
        { label: '형사공판', href: '#' },
        { label: '형사신청', href: '#' },
        { label: '형사약식', href: '#' },
        { label: '영장/즉결', href: '#' },
      ]},
      { title: '가사서류', items: [
        { label: '가사소송·비송', href: '#' },
        { label: '가사조정', href: '#' },
        { label: '가사신청', href: '#' },
        { label: '과태료/감치', href: '#' },
        { label: '가족관계등록비송', href: '#' },
        { label: '전체서류', href: '#' },
      ]},
      { title: '행정서류', items: [] },
      { title: '특허서류', items: [] },
      { title: '회생파산서류', items: [
        { label: '개인회생', href: '#' },
        { label: '개인파산', href: '#' },
        { label: '법인회생(간이회생 포함)', href: '#' },
        { label: '법인파산', href: '#' },
        { label: '일반회생(간이회생 포함)', href: '#' },
        { label: '기타사건', href: '#' },
      ]},
      { title: '민사집행서류', items: [
        { label: '부동산 등 집행', href: '#' },
        { label: '채권압류 등', href: '#' },
        { label: '채권배당', href: '#' },
        { label: '재산명시/감치', href: '#' },
        { label: '재산조회/채무불이행자명부', href: '#' },
        { label: '그 밖의 집행', href: '#' },
      ]},
      { title: '보호서류', items: [
        { label: '소년보호', href: '#' },
        { label: '가정아동성보호', href: '#' },
      ]},
      { title: '비송,과태료 서류', items: [] },
      { title: '회신서등 제출', items: [] },
    ],
    columns: [
      [
        { title: '서류검색', items: [] },
        { title: '민사서류', items: [
          { label: '민사본안', href: '/apply' },
          { label: '민사신청', href: '/apply' },
          { label: '지급명령(독촉)신청', href: '/apply' },
          { label: '전체서류', href: '/apply' },
        ]},
      ],
      [
        { title: '형사서류', items: [
          { label: '형사공판', href: '#' },
          { label: '형사신청', href: '#' },
          { label: '형사약식', href: '#' },
          { label: '영장/즉결', href: '#' },
        ]},
      ],
      [
        { title: '가사서류', items: [
          { label: '가사소송·비송', href: '#' },
          { label: '가사조정', href: '#' },
          { label: '가사신청', href: '#' },
          { label: '과태료/감치', href: '#' },
          { label: '가족관계등록비송', href: '#' },
          { label: '전체서류', href: '#' },
        ]},
        { title: '보호서류', items: [
          { label: '소년보호', href: '#' },
          { label: '가정아동성보호', href: '#' },
        ]},
      ],
      [
        { title: '행정서류', items: [] },
        { title: '특허서류', items: [] },
        { title: '회생파산서류', items: [
          { label: '개인회생', href: '#' },
          { label: '개인파산', href: '#' },
          { label: '법인회생(간이회생 포함)', href: '#' },
          { label: '법인파산', href: '#' },
          { label: '일반회생(간이회생 포함)', href: '#' },
          { label: '기타사건', href: '#' },
        ]},
      ],
      [
        { title: '민사집행서류', items: [
          { label: '부동산 등 집행', href: '#' },
          { label: '채권압류 등', href: '#' },
          { label: '채권배당', href: '#' },
          { label: '재산명시/감치', href: '#' },
          { label: '재산조회/채무불이행자명부', href: '#' },
          { label: '그 밖의 집행', href: '#' },
        ]},
        { title: '비송,과태료 서류', items: [] },
        { title: '회신서등 제출', items: [] },
      ],
    ],
  },

  '각종신청': {
    image: '📄',
    groups: [
      { title: '판결문전자송달신청', items: [
        { label: '판결문전자송달신청', href: '#' },
        { label: '판결문전자송달신청내역', href: '#' },
      ]},
      { title: '알림서비스신청', items: [] },
      { title: '송달료 자동납부신청', items: [] },
      { title: '제증명발급신청', items: [
        { label: '제증명발급신청', href: '#' },
        { label: '제증명발급내역', href: '#' },
      ]},
      { title: '그림자배심 참가신청', items: [
        { label: '국민참여재판 일정', href: '#' },
        { label: '그림자배심 참가신청', href: '#' },
      ]},
      { title: '기록 열람 신청', items: [
        { label: '열람제한문서 열람신청', href: '#' },
        { label: '열람제한문서열람', href: '#' },
        { label: '원심사건기록 열람신청', href: '#' },
        { label: '원심사건기록열람', href: '#' },
      ]},
    ],
  },

  '사건유형별 절차안내': {
    image: '📚',
    groups: [
      { title: '공통안내', items: [
        { label: '전자소송안내', href: '#' },
        { label: '영상재판안내', href: '#' },
        { label: '재판지원안내', href: '#' },
        { label: '관할법원안내', href: '#' },
        { label: '법률용어안내', href: '#' },
        { label: '납부환급안내', href: '#' },
        { label: '알림서비스안내', href: '#' },
        { label: '양식 및 작성안내', href: '#' },
        { label: '법원상담사례', href: '#' },
      ]},
      { title: '민사', items: [
        { label: '민사소송의 개요', href: '#' },
        { label: '민사소송의 진행', href: '#' },
        { label: '민사소송의 종결', href: '#' },
        { label: '일반소송 외 절차', href: '#' },
        { label: '민사신청', href: '#' },
      ]},
      { title: '가사', items: [
        { label: '가사소송(조정)', href: '#' },
        { label: '가사비송', href: '#' },
        { label: '가사신청', href: '#' },
        { label: '협의이혼', href: '#' },
      ]},
      { title: '행정', items: [
        { label: '행정소송의 개요', href: '#' },
        { label: '행정소송의 진행', href: '#' },
      ]},
      { title: '특허', items: [
        { label: '특허소송의 개념', href: '#' },
        { label: '특허소송의 진행', href: '#' },
      ]},
      { title: '개인파산/회생', items: [
        { label: '개인파산 및 면책', href: '#' },
        { label: '개인회생', href: '#' },
      ]},
      { title: '강제집행', items: [
        { label: '강제집행의 개요', href: '#' },
        { label: '부동산 강제집행', href: '#' },
        { label: '채권에대한 강제집행', href: '#' },
        { label: '동산에대한 강제집행', href: '#' },
        { label: '기타집행절차', href: '#' },
        { label: '강제집행정지', href: '#' },
      ]},
      { title: '형사', items: [
        { label: '형사소송', href: '#' },
        { label: '국민참여재판', href: '#' },
        { label: '인신보호제도', href: '#' },
        { label: '안내(홍보)자료 모음', href: '#' },
      ]},
      { title: '가정보호', items: [
        { label: '가정보호재판의 개요', href: '#' },
        { label: '보호처분 결정', href: '#' },
      ]},
      { title: '소년보호', items: [
        { label: '소년보호재판의 개요', href: '#' },
        { label: '소년보호재판의 진행', href: '#' },
        { label: '보호처분', href: '#' },
        { label: '통고제도', href: '#' },
      ]},
      { title: '가족관계등록비송', items: [
        { label: '개명', href: '#' },
        { label: '가족관계등록창설', href: '#' },
        { label: "국적취득자의 성'본 창설", href: '#' },
        { label: '가족관계등록부 정정', href: '#' },
      ]},
      { title: '가족관계등록', items: [] },
      { title: '공탁', items: [] },
      { title: '나홀로소송', items: [] },
    ],
  },

  '고객센터': {
    image: '🏛️',
    groups: [
      { title: '공지사항', items: [] },
      { title: '자주하는질문', items: [] },
      { title: '문제해결안내', items: [] },
      { title: '인증/보안\n(프로그램설치)', items: [] },
      { title: '사이트이용안내', items: [
        { label: '이용약관', href: '#' },
        { label: '개인정보처리방침', href: '#' },
        { label: '저작권보호정책', href: '#' },
        { label: '이용안내', href: '#' },
      ]},
      { title: '고객의소리', items: [] },
      { title: '링크시유의사항', items: [] },
      { title: '재판조력자게시판', items: [] },
      { title: '사이트맵', items: [] },
    ],
  },
}

const MENUS = ['나의전자소송', '서류제출', '각종신청', '사건유형별 절차안내', '고객센터']
const HREFS: Record<string, string> = {
  '나의전자소송': '/mypage',
  '서류제출': '/apply',
  '각종신청': '#',
  '사건유형별 절차안내': '#',
  '고객센터': '#',
}

/* ─────────────────────────────────────
   컴포넌트
───────────────────────────────────── */
export default function GnbNav({ active }: { active?: string }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const handleMenuClick = (label: string) => {
    const href = HREFS[label]
    if (href && href !== '#') {
      if (!user) { setShowLogin(true); return }
      router.push(href)
    }
  }

  const handleSubClick = (href: string) => {
    setOpenMenu(null)
    if (href === '#') { alert('실습 모드에서는 지원되지 않습니다.'); return }
    if (!user) { setShowLogin(true); return }
    router.push(href)
  }

  // 그룹을 4열로 나누기
  const chunkGroups = (groups: MenuGroup[]) => {
    const cols: MenuGroup[][] = [[], [], [], []]
    groups.forEach((g, i) => { cols[i % 4].push(g) })
    return cols
  }

  return (
    <>
      {/* ── 유틸 바 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e3ea', height: 36, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 12, color: '#555' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0 }}>
          <span style={{ padding: '3px 14px', background: '#f0f0f0', borderRadius: 12, color: '#333', fontSize: 12, marginRight: 10 }}>환영합니다</span>
          {user ? (
            <>
              <span style={{ color: '#0067c2', fontWeight: 600, padding: '0 10px', borderRight: '1px solid #d8dce4' }}>{user.name} 님</span>
              {user.role === 'admin' && (
                <Link href="/admin" style={{ padding: '0 10px', borderRight: '1px solid #d8dce4', color: '#555', textDecoration: 'none' }}>관리자</Link>
              )}
              <Link href="/mypage" style={{ padding: '0 10px', borderRight: '1px solid #d8dce4', color: '#0067c2', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>나의전자소송</Link>
              <button onClick={logout} style={{ padding: '0 10px', background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', borderRight: '1px solid #d8dce4', fontFamily: 'inherit' }}>로그아웃</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowLogin(true)} style={{ padding: '0 10px', background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', borderRight: '1px solid #d8dce4', fontFamily: 'inherit' }}>사용자등록</button>
              <button onClick={() => setShowLogin(true)} style={{ padding: '0 10px', background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', borderRight: '1px solid #d8dce4', fontFamily: 'inherit' }}>로그인</button>
            </>
          )}
          <span style={{ padding: '0 10px', borderRight: '1px solid #d8dce4' }}>English</span>
          <span style={{ padding: '0 10px' }}>화면크기 + -</span>
        </div>
      </div>

      {/* ── GNB ── */}
      <div
        style={{ position: 'sticky', top: 0, zIndex: 500, background: '#fff', borderBottom: openMenu ? 'none' : '1px solid #e0e3ea', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <nav style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', height: 70, padding: '0 20px' }}>
          {/* 로고 */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 40, flexShrink: 0, textDecoration: 'none' }}>
            <div style={{ width: 54, height: 54, background: 'linear-gradient(135deg,#003087,#0067c2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 24, filter: 'brightness(0) invert(1)' }}>⚖</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#0067c2', fontWeight: 600, letterSpacing: 1 }}>대한민국 법원 전자소송포털</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', letterSpacing: -0.5 }}>ECFS (전자사건접수시스템) 모의시스템</div>
            </div>
          </Link>

          {/* 메뉴 */}
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, height: 70 }}>
            {MENUS.map(label => (
              <div
                key={label}
                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                onMouseEnter={() => setOpenMenu(label)}
              >
                <button
                  onClick={() => handleMenuClick(label)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0 18px', height: 70,
                    fontSize: 15, fontWeight: 600, background: 'none', border: 'none',
                    color: active === label || openMenu === label ? '#003087' : '#1a1a2e',
                    borderBottom: active === label || openMenu === label ? '3px solid #003087' : '3px solid transparent',
                    whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'color .15s',
                  }}
                >
                  {label}
                </button>
              </div>
            ))}
          </div>

          {/* 우측 */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 20, color: '#333' }}>🔍</button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 20, color: '#333' }}>☰</button>
          </div>
        </nav>

        {/* ── 메가 드롭다운 패널 ── */}
        {openMenu && MEGA[openMenu] && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 70,
            background: '#fff', borderTop: '1px solid #e0e3ea',
            borderBottom: '2px solid #e0e3ea',
            boxShadow: '0 8px 24px rgba(0,0,0,.1)',
            zIndex: 600, display: 'flex',
          }}>
            {/* 좌측 일러스트 영역 */}
            <div style={{
              width: 260, background: '#f0f6fb', flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '32px 20px', gap: 10, borderRight: '1px solid #e0e3ea',
            }}>
              <div style={{ fontSize: 72 }}>{MEGA[openMenu].image}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a3a6b', textAlign: 'center' }}>{openMenu}</div>
              {/* 초록 잎 장식 */}
              <div style={{ fontSize: 28, opacity: 0.5 }}>🍃</div>
            </div>

            {/* 우측 메뉴 그리드 */}
            <div style={{ flex: 1, padding: '24px 28px', display: 'grid', gridTemplateColumns: `repeat(${(MEGA[openMenu].columns || chunkGroups(MEGA[openMenu].groups)).length}, 1fr)`, gap: '0 24px', maxHeight: 480, overflowY: 'auto' }}>
              {(MEGA[openMenu].columns || chunkGroups(MEGA[openMenu].groups)).map((col, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {col.map((group, gi) => (
                    <div key={gi}>
                      {/* 그룹 헤더 */}
                      <div style={{
                        background: '#eef2f8', border: '1px solid #d0daea',
                        borderRadius: 4, padding: '7px 12px', fontSize: 13,
                        fontWeight: 700, color: '#1a3a6b', marginBottom: 8,
                        whiteSpace: 'pre-line', cursor: group.items.length === 0 ? 'default' : 'pointer',
                      }}>
                        {group.title}
                      </div>
                      {/* 서브 아이템 */}
                      {group.items.map((item, ii) => (
                        <button
                          key={ii}
                          onClick={() => handleSubClick(item.href)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 13, color: '#333', padding: '4px 4px',
                            textAlign: 'left', width: '100%', fontFamily: 'inherit',
                            lineHeight: 1.4,
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#003087' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333' }}
                        >
                          <span style={{ color: '#aaa', fontSize: 10, flexShrink: 0 }}>·</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
