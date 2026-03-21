'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MockBar from '@/components/layout/MockBar';
import GnbNav from '@/components/layout/GnbNav';
import Footer from '@/components/layout/Footer';
import LoginModal from '@/components/auth/LoginModal';
import { useAuth } from '@/context/AuthContext';

const notices = [
  { text: '전자소송 시스템 정기 점검 안내', date: '2026.03.20' },
  { text: '민사소송 전자제출 서비스 개선 안내', date: '2026.03.15' },
  { text: '법원 전자소송 이용자 교육 프로그램 안내', date: '2026.03.10' },
  { text: '소송비용 납부 방법 변경 안내', date: '2026.03.05' },
  { text: '전자서명 인증서 갱신 안내', date: '2026.02.28' },
];

const quickIcons = [
  { label: '나의사건관리', icon: '📁', href: '/mypage' },
  { label: '작성중서류', icon: '📝', href: '/apply' },
  { label: '미확인송달문서', icon: '📬', href: '/mypage' },
  { label: '제증명발급', icon: '📜', href: '#' },
  { label: '소송비용납부', icon: '💰', href: '#' },
  { label: '알림서비스', icon: '🔔', href: '#' },
];

const docTabs = ['민사 서류', '형사 서류', '가사 서류', '보호 서류', '행정 서류', '특허 서류', '회생·파산 서류'];

const civilDocs = [
  ['소장', '답변서(청구취지/원인)', '준비서면', '서증'],
  ['증인신청서', '청구취지 및 청구원인 변경...', '소취하서', '소송대리허가신청 및 소송위...'],
  ['보정서', '주소보정서(특별송달,공시송...', '기일변경신청서', '항소장'],
  ['항고장', '소송위임장', '', ''],
];

const years = Array.from({ length: 5 }, (_, i) => 2026 - i);
const caseTypes = ['가단', '가합', '나', '다', '라', '마', '바', '사', '아', '자', '카', '타', '파', '하'];

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeDocTab, setActiveDocTab] = useState(0);
  const [caseYear, setCaseYear] = useState('2026');
  const [caseType, setCaseType] = useState('가단');
  const [caseNum, setCaseNum] = useState('');
  const [partyName, setPartyName] = useState('');

  const handleAuthRequired = (href: string) => {
    if (user) router.push(href);
    else setShowLoginModal(true);
  };

  const handleSearch = () => {
    alert('실습 모드에서는 지원되지 않습니다.');
  };

  const inp: React.CSSProperties = {
    border: '1px solid #c8d0dc', borderRadius: 3, padding: '5px 8px',
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MockBar />
      <GnbNav />

      {/* ── 메인 히어로 영역 (연한 하늘색) ── */}
      <div style={{ background: '#d6e8f5', padding: '28px 20px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* 좌측: 검색 + 아이콘 + 배너 */}
          <div>
            {/* 검색바 */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="검색어를 입력해 주세요"
                style={{
                  flex: 1, height: 52, padding: '0 20px',
                  border: '2px solid #00a99d', borderRight: 'none',
                  borderRadius: '26px 0 0 26px', fontSize: 16,
                  fontFamily: 'inherit', outline: 'none', background: '#fff',
                  color: '#333',
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  width: 52, height: 52, background: '#003087', border: 'none',
                  borderRadius: '0 26px 26px 0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: '#fff',
                }}
              >
                🔍
              </button>
            </div>

            {/* 해시태그 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
              {['#나의사건', '#답변서', '#민사', '#소송'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchValue(tag.slice(1))}
                  style={{
                    background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,48,135,0.2)',
                    borderRadius: 20, padding: '4px 14px', fontSize: 13,
                    color: '#003087', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* 하단: 롤링배너 + 6개 아이콘 */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>
              {/* 롤링배너 자리 (실습 공지) */}
              <div style={{
                background: '#fff', borderRadius: 8, padding: '16px',
                border: '1px solid #b8d4e8', minHeight: 200,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 13, color: '#555', fontWeight: 600, marginBottom: 6 }}>
                    실습 안내
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', lineHeight: 1.4, marginBottom: 10 }}>
                    전자소송<br />실습 시스템
                  </div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>
                    이 시스템은 법원 전자소송 포털을<br />
                    실습하기 위한 모의 환경입니다.<br />
                    실제 법원 접수와 무관합니다.
                  </div>
                </div>
                <button
                  onClick={() => handleAuthRequired('/mypage')}
                  style={{
                    background: '#1a3a6b', color: '#fff', border: 'none',
                    borderRadius: 4, padding: '8px 16px', fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start',
                  }}
                >
                  바로가기
                </button>
              </div>

              {/* 6개 아이콘 퀵메뉴 */}
              <div style={{
                background: '#1a4999', borderRadius: 8, padding: '16px',
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}>
                {quickIcons.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleAuthRequired(item.href)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, padding: '12px 6px', borderRadius: 6,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{
                      width: 48, height: 48, background: 'rgba(255,255,255,0.15)',
                      borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 22,
                    }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 우측: 로그인 + 사건검색 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 로그인 박스 */}
            <div style={{ background: '#fff', borderRadius: 8, padding: '16px', border: '1px solid #b8d4e8' }}>
              {user ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#333', marginBottom: 12 }}>
                    <strong style={{ color: '#003087' }}>{user.name}</strong> 님, 환영합니다
                  </div>
                  <button
                    onClick={() => router.push('/mypage')}
                    style={{
                      width: '100%', height: 44, background: '#00a99d', color: '#fff',
                      border: 'none', borderRadius: 4, fontSize: 15, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
                    }}
                  >
                    나의전자소송 바로가기
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    style={{
                      width: '100%', height: 44, background: '#00a99d', color: '#fff',
                      border: 'none', borderRadius: 4, fontSize: 15, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
                    }}
                  >
                    로그인
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 0 }}>
                    <button style={{ background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', padding: '0 12px', borderRight: '1px solid #ddd', fontFamily: 'inherit' }}>
                      아이디/비밀번호찾기
                    </button>
                    <button style={{ background: 'none', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', padding: '0 12px', fontFamily: 'inherit' }}>
                      사용자등록
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 사건검색 / 발급문서조회 탭 */}
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #b8d4e8', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #dde1e7' }}>
                {['사건검색', '발급문서조회'].map((tab, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, padding: '10px 0', textAlign: 'center',
                      fontSize: 13, fontWeight: i === 0 ? 700 : 400,
                      color: i === 0 ? '#003087' : '#666',
                      borderBottom: i === 0 ? '2px solid #003087' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {tab}
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 14px 16px' }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>법원선택</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select style={{ ...inp, flex: 1 }}>
                      <option>대법원</option>
                      <option>서울중앙지방법원</option>
                      <option>서울동부지방법원</option>
                    </select>
                    <span style={{ fontSize: 11, color: '#0067c2', cursor: 'pointer', whiteSpace: 'nowrap' }}>ℹ 입력방법예시</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555', marginTop: 5, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: '#003087' }} />
                    사건구분입력모드
                  </label>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>사건번호 <span style={{ color: '#e00' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select value={caseYear} onChange={e => setCaseYear(e.target.value)} style={{ ...inp, width: 68 }}>
                      {years.map(y => <option key={y}>{y}</option>)}
                    </select>
                    <select value={caseType} onChange={e => setCaseType(e.target.value)} style={{ ...inp, width: 60 }}>
                      {caseTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input
                      type="text"
                      value={caseNum}
                      onChange={e => setCaseNum(e.target.value)}
                      style={{ ...inp, flex: 1 }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>당사자명 <span style={{ color: '#e00' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={partyName}
                      onChange={e => setPartyName(e.target.value)}
                      placeholder="당사자명 필수입력"
                      style={{ ...inp, flex: 1 }}
                    />
                    <button
                      onClick={handleSearch}
                      style={{
                        background: '#4a4a5a', color: '#fff', border: 'none',
                        borderRadius: 3, padding: '5px 14px', fontSize: 13,
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                      }}
                    >
                      조회
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 서류 탭 섹션 ── */}
      <div style={{ background: '#fff', borderTop: '1px solid #dde1e7', borderBottom: '1px solid #dde1e7' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '160px 1fr', minHeight: 240 }}>
          {/* 좌측: 서류제출 이미지 박스 */}
          <div style={{
            background: 'linear-gradient(160deg, #2a5298, #1a3a6b)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, color: '#fff',
          }}>
            <div style={{ fontSize: 44 }}>📂</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>서류제출</div>
          </div>

          {/* 우측: 탭 + 서류 목록 */}
          <div>
            {/* 탭 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #dde1e7', overflowX: 'auto' }}>
              {docTabs.map((tab, i) => (
                <button
                  key={i}
                  onClick={() => setActiveDocTab(i)}
                  style={{
                    padding: '10px 16px', fontSize: 13, border: 'none',
                    borderBottom: activeDocTab === i ? '2px solid #00a99d' : '2px solid transparent',
                    background: 'transparent',
                    color: activeDocTab === i ? '#00a99d' : '#555',
                    fontWeight: activeDocTab === i ? 700 : 400,
                    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 서류 목록 */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>자주찾는 서류</span>
                  <span style={{ fontSize: 12, color: '#888', background: '#f3f4f6', padding: '2px 8px', borderRadius: 3 }}>
                    로그인 후 서류작성이 가능합니다.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleAuthRequired('/apply')} style={{ fontSize: 12, padding: '4px 12px', border: '1px solid #aaa', borderRadius: 3, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>전체서류 ›</button>
                  <button onClick={handleSearch} style={{ fontSize: 12, padding: '4px 12px', border: '1px solid #aaa', borderRadius: 3, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>서류검색 ›</button>
                </div>
              </div>

              {activeDocTab === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 0' }}>
                  {civilDocs.map((row, ri) =>
                    row.map((doc, ci) => doc ? (
                      <div key={`${ri}-${ci}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#0067c2' }}>•</span>
                        <button
                          onClick={() => handleAuthRequired('/apply')}
                          style={{ background: 'none', border: 'none', fontSize: 13, color: '#333', cursor: 'pointer', textAlign: 'left', padding: '2px 0', fontFamily: 'inherit' }}
                        >
                          {doc}
                        </button>
                        <span style={{ fontSize: 10, color: '#0067c2' }}>📋</span>
                      </div>
                    ) : <div key={`${ri}-${ci}`} />)
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#999', padding: '20px 0' }}>
                  해당 서류 목록은 실습 모드에서 지원되지 않습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 공지사항 ── */}
      <div style={{ background: '#f7f9fc', flex: 1 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ background: '#fff', border: '1px solid #dde1e7', borderRadius: 8, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>공지사항</h3>
              <span style={{ fontSize: 12, color: '#888', cursor: 'pointer' }}>더보기 &gt;</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notices.map((n, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: i < notices.length - 1 ? '1px solid #f0f2f5' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#003087', fontSize: 10 }}>●</span>
                    {n.text}
                  </span>
                  <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', marginLeft: 16 }}>{n.date}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Footer />

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}
