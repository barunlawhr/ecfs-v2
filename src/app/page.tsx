'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MockBar from '@/components/layout/MockBar';
import GnbNav from '@/components/layout/GnbNav';
import Footer from '@/components/layout/Footer';
import LoginModal from '@/components/auth/LoginModal';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const quickIcons = [
  { label: '나의사건관리', icon: '📁', href: '/mypage' },
  { label: '작성중서류', icon: '📝', href: '/apply?new=true' },
  { label: '미확인송달문서', icon: '📬', href: '/mypage?page=unconfirmed-delivery-new' },
  { label: '제증명발급', icon: '📜', href: '#' },
  { label: '소송비용납부', icon: '💰', href: '#' },
  { label: '알림서비스', icon: '🔔', href: '#' },
];

const docTabs = ['민사 서류', '형사 서류', '가사 서류', '보호 서류', '행정 서류', '특허 서류', '회생·파산 서류', '민사집행 서류', '비송·과태료 서류'];

const civilDocs = [
  { name: '소장', href: '/apply?new=true' },
  { name: '답변서(청구취지/원인)', href: '/answer' },
  { name: '준비서면', href: '#' },
  { name: '서증', href: '#' },
  { name: '증인신청서', href: '#' },
  { name: '청구취지 및 청구원인 변경...', href: '#' },
  { name: '소취하서', href: '#' },
  { name: '소송대리허가신청 및 소송위...', href: '#' },
  { name: '보정서', href: '#' },
  { name: '주소보정서(특별송달,공시송...', href: '#' },
  { name: '기일변경신청서', href: '#' },
  { name: '항소장', href: '#' },
  { name: '항고장', href: '#' },
  { name: '소송위임장', href: '#' },
];

const procedureIcons = [
  { label: '민사', icon: '⚖️' },
  { label: '형사', icon: '🔒' },
  { label: '가사', icon: '👨‍👩‍👧' },
  { label: '행정', icon: '🏛️' },
  { label: '특허', icon: '💡' },
  { label: '개인파산/회생', icon: '🔄' },
  { label: '강제집행', icon: '📌' },
  { label: '신청', icon: '📋' },
  { label: '가족관계등록', icon: '👪' },
  { label: '공탁', icon: '🏦' },
];

const counselLinks = [
  { tag: '가사', color: '#00a99d', text: '협의이혼시 필요한 서류는 무엇인가요?' },
  { tag: '신청', color: '#f59e0b', text: '임차관 등기명령신청서류 작성안내' },
  { tag: '신청', color: '#f59e0b', text: '재산명시제도에 대해?' },
  { tag: '형사', color: '#ef4444', text: '법원에서 보내 등기우편물을 수령하...' },
  { tag: '형사', color: '#ef4444', text: '법원에서 보내 등기우편물을 수령하...' },
];

const trialLinks = [
  '소구구조제도',
  '개인파산/회생/소구구조조 지정변호사 제도',
  '국선변호인선정제도',
  '장애인 사법지원',
  '국선번역/통역 수어',
];

const civilianLinks = [
  '정보공개청구',
  '판결서 사본제공 신청',
  '판결서 인터넷 열람 신청',
  '국민참여재판 그림자배심 신청',
  '법에에 바란다',
];

const years = Array.from({ length: 5 }, (_, i) => 2026 - i);
const caseTypes = ['가단', '가합', '나', '다', '라', '마'];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeDocTab, setActiveDocTab] = useState(0);
  const [caseYear, setCaseYear] = useState('2026');
  const [caseType, setCaseType] = useState('다');
  const [caseNum, setCaseNum] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase.from('delivery_documents')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .is('received_at', null);
      setUnreadCount(count || 0);
    })();
  }, [user]);
  const [partyName, setPartyName] = useState('');

  const go = (href: string) => {
    if (href === '#' || href.startsWith('#')) { alert('실습 모드에서는 지원되지 않습니다.'); return; }
    if (!user) {
      localStorage.setItem('redirectAfterLogin', href)
      setShowLoginModal(true)
      return
    }
    router.push(href);
  };

  const inp: React.CSSProperties = {
    border: '1px solid #c8d0dc', borderRadius: 3, padding: '5px 8px',
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <MockBar />
      <GnbNav />

      {/* ══════════════════════════════════════
          히어로 영역 (연한 하늘색)
      ══════════════════════════════════════ */}
      <div style={{ background: '#dce8f2', padding: '24px 20px 20px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 330px', gap: 20 }}>

          {/* 좌측 */}
          <div>
            {/* 검색바 */}
            <div style={{ display: 'flex', marginBottom: 12 }}>
              <input
                type="text" value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && alert('실습 모드에서는 지원되지 않습니다.')}
                placeholder="검색어를 입력해 주세요"
                style={{
                  flex: 1, height: 50, padding: '0 22px',
                  border: '2px solid #00a99d', borderRight: 'none',
                  borderRadius: '25px 0 0 25px', fontSize: 15,
                  fontFamily: 'inherit', outline: 'none', background: '#fff',
                }}
              />
              <button style={{
                width: 50, height: 50, background: '#003087', border: 'none',
                borderRadius: '0 25px 25px 0', cursor: 'pointer', fontSize: 18, color: '#fff',
              }}>🔍</button>
            </div>

            {/* 해시태그 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {['#나의사건', '#답변서', '#민사', '#소송'].map(tag => (
                <button key={tag} onClick={() => setSearchValue(tag.slice(1))} style={{
                  background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,48,135,0.18)',
                  borderRadius: 20, padding: '4px 16px', fontSize: 13,
                  color: '#003087', cursor: 'pointer', fontFamily: 'inherit',
                }}>{tag}</button>
              ))}
            </div>

            {/* 롤링배너 + 6개 아이콘 */}
            <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 12 }}>
              {/* 배너 */}
              <div style={{
                background: '#fff', borderRadius: 10, padding: '18px',
                border: '1px solid #b8d0e8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 210,
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>실습 안내</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: '#1a3a6b', lineHeight: 1.4, marginBottom: 10 }}>
                    [바른커리어]<br />전자소송모의실습
                  </div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8 }}>
                    바른커리어 법률사무원<br />전자소송 실습 시스템입니다.<br />실제 법원 접수와 무관합니다.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <button onClick={() => go('/mypage')} style={{
                    background: '#1a3a6b', color: '#fff', border: 'none',
                    borderRadius: 4, padding: '7px 16px', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>바로가기</button>
                  <span style={{ fontSize: 11, color: '#aaa' }}>1/7 ← ‖ →</span>
                </div>
              </div>

              {/* 6개 아이콘 */}
              <div style={{
                background: '#1a4999', borderRadius: 10, padding: '14px',
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
              }}>
                {quickIcons.map((item, i) => (
                  <button key={i} onClick={() => go(item.href)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 7, padding: '10px 4px', borderRadius: 6, fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{
                      width: 46, height: 46, background: 'rgba(255,255,255,0.18)',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                      position: 'relative',
                    }}>
                      {item.icon}
                      {item.label === '미확인송달문서' && unreadCount > 0 && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4,
                          background: '#e8173e', color: '#fff', fontSize: 10, fontWeight: 800,
                          minWidth: 18, height: 18, borderRadius: 9,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0 4px', lineHeight: 1,
                        }}>{unreadCount}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#fff', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 우측: 로그인 + 사건검색 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 로그인 */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '16px', border: '1px solid #b8d0e8' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#aaa' }}>
                  로그인 상태 확인 중...
                </div>
              ) : user ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#333', marginBottom: 10 }}>
                    <strong style={{ color: '#003087' }}>{user.name}</strong> 님 환영합니다
                  </div>
                  <button onClick={() => router.push('/mypage')} style={{
                    width: '100%', height: 42, background: '#00a99d', color: '#fff',
                    border: 'none', borderRadius: 4, fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>나의전자소송 →</button>
                </div>
              ) : (
                <>
                  <button onClick={() => setShowLoginModal(true)} style={{
                    width: '100%', height: 42, background: '#00a99d', color: '#fff',
                    border: 'none', borderRadius: 4, fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
                  }}>로그인</button>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button style={{ background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', padding: '0 12px', borderRight: '1px solid #ddd', fontFamily: 'inherit' }}>아이디/비밀번호찾기</button>
                    <button style={{ background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', padding: '0 12px', fontFamily: 'inherit' }}>사용자등록</button>
                  </div>
                </>
              )}
            </div>

            {/* 사건검색 탭 */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #b8d0e8', overflow: 'hidden', flex: 1 }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                {['사건검색', '발급문서조회'].map((tab, i) => (
                  <div key={i} style={{
                    flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 13,
                    fontWeight: i === 0 ? 700 : 400,
                    color: i === 0 ? '#003087' : '#666',
                    borderBottom: i === 0 ? '2px solid #003087' : '2px solid transparent',
                    cursor: 'pointer',
                  }}>{tab}</div>
                ))}
              </div>
              <div style={{ padding: '14px' }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>법원선택</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select style={{ ...inp, flex: 1 }}>
                      <option>대법원</option><option>서울중앙지방법원</option>
                    </select>
                    <span style={{ fontSize: 11, color: '#0067c2', cursor: 'pointer', whiteSpace: 'nowrap' }}>ℹ 입력방법예시</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555', marginTop: 5, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: '#003087' }} /> 사건구분입력모드
                  </label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>사건번호 <span style={{ color: '#e00' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select value={caseYear} onChange={e => setCaseYear(e.target.value)} style={{ ...inp, width: 66 }}>
                      {years.map(y => <option key={y}>{y}</option>)}
                    </select>
                    <select value={caseType} onChange={e => setCaseType(e.target.value)} style={{ ...inp, width: 58 }}>
                      {caseTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input type="text" value={caseNum} onChange={e => setCaseNum(e.target.value)} style={{ ...inp, flex: 1 }} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>당사자명 <span style={{ color: '#e00' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="당사자명 필수입력" style={{ ...inp, flex: 1 }} />
                    <button onClick={() => alert('실습 모드에서는 지원되지 않습니다.')} style={{
                      background: '#4a4a5a', color: '#fff', border: 'none', borderRadius: 3,
                      padding: '5px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                    }}>조회</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          서류 탭 섹션
      ══════════════════════════════════════ */}
      <div style={{ background: '#fff', borderTop: '1px solid #dde1e7', borderBottom: '3px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '130px 1fr' }}>
          <div style={{
            background: 'linear-gradient(160deg,#2a5298,#1a3a6b)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, color: '#fff', minHeight: 180, padding: '20px 10px',
          }}>
            <div style={{ fontSize: 40 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>서류제출</div>
          </div>
          <div>
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
              {docTabs.map((tab, i) => (
                <button key={i} onClick={() => setActiveDocTab(i)} style={{
                  padding: '10px 14px', fontSize: 13, border: 'none',
                  borderBottom: activeDocTab === i ? '2px solid #00a99d' : '2px solid transparent',
                  background: 'transparent', color: activeDocTab === i ? '#00a99d' : '#555',
                  fontWeight: activeDocTab === i ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}>{tab}</button>
              ))}
            </div>
            <div style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>자주찾는 서류</span>
                  <span style={{ fontSize: 12, color: '#888', background: '#f3f4f6', padding: '2px 8px', borderRadius: 3 }}>로그인 후 서류작성이 가능합니다.</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => go('/apply?new=true')} style={{ fontSize: 12, padding: '4px 12px', border: '1px solid #aaa', borderRadius: 3, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>전체서류 ›</button>
                  <button onClick={() => alert('실습 모드')} style={{ fontSize: 12, padding: '4px 12px', border: '1px solid #aaa', borderRadius: 3, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>서류검색 ›</button>
                </div>
              </div>
              {activeDocTab === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: 6 }}>
                  {civilDocs.map((doc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#0067c2' }}>•</span>
                      <button onClick={() => go(doc.href)} style={{
                        background: 'none', border: 'none', fontSize: 13, color: '#222',
                        cursor: 'pointer', textAlign: 'left', padding: '2px 0', fontFamily: 'inherit',
                      }}>{doc.name}</button>
                      <span style={{ fontSize: 10, color: '#0067c2' }}>📋</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#aaa', padding: '16px 0' }}>해당 서류는 실습 모드에서 지원되지 않습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          공지사항 ticker
      ══════════════════════════════════════ */}
      <div style={{ background: '#1a3a6b', color: '#fff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 42 }}>
          <span style={{ fontSize: 13, fontWeight: 700, marginRight: 16, whiteSpace: 'nowrap' }}>📢 공지사항</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: 13 }}>항소(항고)이유서 제출 제도 시행 안내</span>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', marginLeft: 16 }}>2025.01.14</span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
            {['↑', '↓', '‖'].map((c, i) => (
              <button key={i} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 22, height: 22, borderRadius: 2, cursor: 'pointer', fontSize: 11 }}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          나홀로소송 섹션
      ══════════════════════════════════════ */}
      <div style={{ background: '#f7f9fc', padding: '48px 20px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>나홀로소송</h2>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>소송서류에 대해 알기 쉽게 안내해 드립니다</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* 좌측: 처음이신가요? */}
            <div style={{ background: '#fff', border: '1px solid #dde1e7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#f0f4fa', padding: '16px 20px', borderBottom: '1px solid #dde1e7' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>처음이신가요?</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  {/* 소장 작성 방법 */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3a6b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ background: '#1a3a6b', color: '#fff', borderRadius: 3, padding: '2px 7px', fontSize: 11 }}>소장</span>
                      작성방법
                    </div>
                    {['소장 작성 대표형식', '기재사항 및 작성방법', '소요되는 비용', '소장 제출방법'].map(item => (
                      <button key={item} onClick={() => alert('실습 모드')} style={{
                        display: 'block', width: '100%', textAlign: 'left', background: 'none',
                        border: 'none', fontSize: 13, color: '#444', cursor: 'pointer',
                        padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontFamily: 'inherit',
                      }}>› {item}</button>
                    ))}
                  </div>
                  {/* 피고의 대응 */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3a6b', marginBottom: 10 }}>피고의 대응</div>
                    {['소장에 대한 답변서', '지급명령에 대한 이의', '보전처분에 대한 불복', '강제집행 정지'].map(item => (
                      <button key={item} onClick={() => item.includes('답변서') ? go('/answer') : alert('실습 모드')} style={{
                        display: 'block', width: '100%', textAlign: 'left', background: 'none',
                        border: 'none', fontSize: 13, color: '#444', cursor: 'pointer',
                        padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontFamily: 'inherit',
                      }}>› {item}</button>
                    ))}
                  </div>
                </div>

                {/* TIP 박스 */}
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>TIP!</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>소송보다 간편한 해결 절차에 대해 알려드릴게요</div>
                      {['소액소송이란', '민사조정이란', '지급명령(독촉)이란', '제소전 화해제도란'].map(t => (
                        <button key={t} onClick={() => alert('실습 모드')} style={{
                          display: 'inline-block', margin: '3px 4px 3px 0', padding: '3px 10px',
                          border: '1px solid #d1d5db', borderRadius: 12, fontSize: 12,
                          background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                        }}>{t}</button>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>소송에 대해 궁금한 점이 있으신가요?</div>
                      {['소송절차 관련 자주 묻는 질문', '서류작성 관련 자주 묻는 질문'].map(t => (
                        <button key={t} onClick={() => alert('실습 모드')} style={{
                          display: 'block', padding: '6px 12px', margin: '4px 0',
                          border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12,
                          background: '#fff', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left',
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측: 소송방법 + 서류작성 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 01 소송방법과 절차 */}
              <div style={{ background: '#fff', border: '1px solid #dde1e7', borderRadius: 10, overflow: 'hidden', flex: 1 }}>
                <div style={{ background: '#f0f4fa', padding: '14px 20px', borderBottom: '1px solid #dde1e7', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: '#1a3a6b', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>01</span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>소송방법과 절차</h3>
                </div>
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: '소장\n작성방법', sub: '소장 작성 대표형식\n기재사항 및 작성방법\n소요되는 비용\n소장 제출방법' },
                    { label: '피고의 대응', sub: '소장에 대한 답변서\n지급명령에 대한 이의\n보전처분에 대한 불복\n강제집행 정지' },
                  ].map((box, i) => (
                    <div key={i} style={{ background: '#f7f9fc', border: '1px solid #e5e7eb', borderRadius: 6, padding: '12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3a6b', marginBottom: 8, whiteSpace: 'pre-line' }}>{box.label}</div>
                      {box.sub.split('\n').map(s => (
                        <button key={s} onClick={() => s.includes('답변서') ? go('/answer') : alert('실습 모드')} style={{
                          display: 'flex', alignItems: 'center', gap: 4, background: 'none',
                          border: 'none', fontSize: 12, color: '#444', cursor: 'pointer',
                          padding: '3px 0', fontFamily: 'inherit', width: '100%', textAlign: 'left',
                        }}>
                          <span style={{ color: '#0067c2', fontSize: 10 }}>›</span> {s}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* 02 서류 작성하기 */}
              <div style={{ background: 'linear-gradient(135deg,#1a3a6b,#2a5298)', border: '1px solid #1a3a6b', borderRadius: 10, padding: '20px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>02</span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>소송서류 작성하기</h3>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6, lineHeight: 1.4 }}>서/류/작/성!</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 16, lineHeight: 1.6 }}>
                  간편하게 시작해 보세요.<br />
                  나홀로 소송에서 제공하는 서증, 서류작성에서 간편한 공정증수소관 및 내용증명로 제공하고 있습니다.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => go('/apply?new=true')} style={{
                    background: '#fff', color: '#1a3a6b', border: 'none', borderRadius: 4,
                    padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>소장 작성하기</button>
                  <button onClick={() => go('/answer')} style={{
                    background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)',
                    borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>답변서 작성하기</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          소송안내마당
      ══════════════════════════════════════ */}
      <div style={{ background: '#fff', padding: '48px 20px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>소송안내마당</h2>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>소송 관련 각종 절차 및 정보를 안내해 드립니다</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
            {/* 절차안내 */}
            <div style={{ border: '1px solid #dde1e7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#f7f9fc', padding: '14px 20px', borderBottom: '1px solid #dde1e7' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>절차안내</h3>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                {procedureIcons.map((p, i) => (
                  <button key={i} onClick={() => alert('실습 모드')} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', fontFamily: 'inherit',
                  }}>
                    <div style={{
                      width: 56, height: 56, background: '#eef4fb', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                      border: '1px solid #d0e0f0',
                    }}>{p.icon}</div>
                    <span style={{ fontSize: 12, color: '#333', fontWeight: 600 }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 양식찾기 */}
            <div style={{ border: '1px solid #dde1e7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#f7f9fc', padding: '14px 20px', borderBottom: '1px solid #dde1e7' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>양식찾기</h3>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>구분</label>
                  <select style={{ ...inp, width: '100%' }}><option>-전체-</option></select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>양식명</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" placeholder="양식명을 입력하세요" style={{ ...inp, flex: 1 }} />
                    <button onClick={() => alert('실습 모드')} style={{
                      background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 3,
                      padding: '5px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    }}>조회</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 8 }}>많이 찾는 양식</div>
                {[
                  '[가족관계등록] 개인신고서',
                  '[개인회생] 개생인 신청서',
                  '[민사] 가압류(가처분) 이의신청서',
                  '[법인회생] 동기요소속록 신청서',
                ].map((item, i) => (
                  <button key={i} onClick={() => alert('실습 모드')} style={{
                    display: 'block', width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', fontSize: 12, color: '#0067c2', cursor: 'pointer',
                    padding: '4px 0', borderBottom: '1px solid #f3f4f6', fontFamily: 'inherit',
                  }}>› {item}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          3단 컬럼: 법원상담사례 / 재판지원 / 민원관련화면
      ══════════════════════════════════════ */}
      <div style={{ background: '#f7f9fc', padding: '36px 20px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            {
              title: '법원상담사례',
              items: counselLinks.map(l => ({ tag: l.tag, color: l.color, text: l.text })),
              isTagged: true,
            },
            {
              title: '재판지원',
              items: trialLinks.map(t => ({ text: t })),
              isTagged: false,
            },
            {
              title: '민원관련화면',
              items: civilianLinks.map(t => ({ text: t })),
              isTagged: false,
            },
          ].map((col, ci) => (
            <div key={ci} style={{ background: '#fff', border: '1px solid #dde1e7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>{col.title}</h3>
                <span style={{ fontSize: 18, color: '#ccc', cursor: 'pointer' }}>+</span>
              </div>
              <div style={{ padding: '12px 18px' }}>
                {col.items.map((item, i) => (
                  <button key={i} onClick={() => alert('실습 모드')} style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', padding: '7px 0',
                    borderBottom: i < col.items.length - 1 ? '1px solid #f3f4f6' : 'none',
                    fontSize: 13, color: '#333', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {col.isTagged && 'tag' in item && (
                      <span style={{
                        background: (item as { tag: string; color: string; text: string }).color,
                        color: '#fff', borderRadius: 3, padding: '1px 6px', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>{(item as { tag: string; color: string; text: string }).tag}</span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#aaa', flexShrink: 0 }}>↗</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          전국법원·등기소정보
      ══════════════════════════════════════ */}
      <div style={{ background: '#fff', padding: '36px 20px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: '0 0 20px' }}>전국법원 · 등기소정보</h3>
          <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
            {[
              { icon: '🏛️', label: '각급법원 안내' },
              { icon: '📍', label: '관할법원 찾기' },
              { icon: '🔍', label: '등기소 찾기' },
            ].map((item, i) => (
              <button key={i} onClick={() => alert('실습 모드')} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
                border: '1px solid #dde1e7', borderRadius: 8, background: '#f7f9fc',
                cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a3a6b', fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
                <span style={{ fontSize: 12, color: '#aaa' }}>↗</span>
              </button>
            ))}
          </div>

          {/* 관련 사이트 링크 */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
            {['대한민국 법원', '전자공탁', '법원경매정보', '사법정보공개포털', '인터넷등기소'].map((site, i) => (
              <div key={i} style={{
                flex: 1, background: '#f7f9fc', border: '1px solid #dde1e7', borderRadius: 8,
                padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>⚖</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#444', lineHeight: 1.4 }}>대한민국 법원<br />{site === '대한민국 법원' ? '' : site}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}
