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

const procedures = [
  { label: '민사소송', icon: '⚖️', desc: '일반 민사 사건 절차 안내' },
  { label: '가사소송', icon: '👨‍👩‍👧', desc: '이혼, 친권 등 가사 사건' },
  { label: '형사소송', icon: '🔒', desc: '형사 사건 전자 제출' },
  { label: '행정소송', icon: '🏛️', desc: '행정처분 불복 절차' },
];

const quickServices = [
  { label: '나의전자소송', icon: '📁', href: '/mypage' },
  { label: '서류제출', icon: '📋', href: '/apply' },
  { label: '각종신청', icon: '📝', href: '/apply' },
  { label: '절차안내', icon: '📚', href: '#procedure' },
  { label: '고객센터', icon: '💬', href: '#' },
  { label: '사건검색', icon: '🔍', href: '#search' },
];

const frequentDocs = [
  '소장(민사)',
  '답변서',
  '준비서면',
  '지급명령신청',
];

const bottomBanners = [
  { label: '민사소장 작성하기', icon: '✏️', href: '/apply' },
  { label: '판결문 열람', icon: '📄', href: '#' },
  { label: '송달료 계산기', icon: '🧮', href: '#' },
];

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [hoveredService, setHoveredService] = useState<number | null>(null);

  const handleAuthRequired = (href: string) => {
    if (user) {
      router.push(href);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleSearch = () => {
    alert('실습 모드에서는 지원되지 않습니다.');
  };

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MockBar />
      <GnbNav />

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a6b, #2952a3)',
        padding: '24px 20px',
      }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', margin: '0 0 8px 0' }}>
            전자소송 실습 시스템
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: '0 0 20px 0' }}>
            법원 전자소송 시스템을 실습 환경에서 경험해보세요
          </p>

          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ color: '#ffd700', fontSize: 15, fontWeight: 'bold', margin: 0 }}>
                환영합니다, {user.name}님
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => router.push('/mypage')}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: 4,
                    padding: '8px 16px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  나의전자소송 →
                </button>
                <button
                  onClick={() => router.push('/apply')}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: 4,
                    padding: '8px 16px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  소장작성 →
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                background: '#c9a227',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              로그인하여 시작하기
            </button>
          )}
        </div>
      </div>

      {/* Quick Services Card (overlapping hero) */}
      <div style={{ background: '#f0f2f5', paddingBottom: 0 }}>
        <div style={{ maxWidth: 980, margin: '-20px auto 0', padding: '0 20px' }}>
          <div style={{
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            padding: '20px 16px',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 8,
            }}>
              {quickServices.map((svc, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (svc.href === '/mypage' || svc.href === '/apply') {
                      handleAuthRequired(svc.href);
                    } else if (svc.href.startsWith('#')) {
                      const el = document.querySelector(svc.href);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  onMouseEnter={() => setHoveredService(i)}
                  onMouseLeave={() => setHoveredService(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '12px 8px',
                    border: 'none',
                    borderRadius: 6,
                    background: hoveredService === i ? '#1a3a6b' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{svc.icon}</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: hoveredService === i ? '#fff' : '#333',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}>
                    {svc.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ background: '#f0f2f5', flex: 1 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 20px' }}>

          {/* 사건 검색 */}
          <div id="search" style={{
            background: '#fff',
            border: '1px solid #dde1e7',
            borderRadius: 8,
            padding: '20px 24px',
            marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 'bold', color: '#1a3a6b', margin: '0 0 12px 0' }}>
              사건번호 조회
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="사건번호를 입력하세요 (예: 2026가단12345)"
                style={{
                  flex: 1,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  padding: '8px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  background: '#1a3a6b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 20px',
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                조회
              </button>
            </div>
          </div>

          {/* 나홀로소송 + 자주 찾는 서류 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* 나홀로소송 카드 (navy) */}
            <div style={{
              background: 'linear-gradient(160deg, #1a3a6b, #2952a3)',
              borderRadius: 8,
              padding: '20px',
              color: '#fff',
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 'bold', margin: '0 0 4px 0' }}>나홀로소송 안내</h3>
              <p style={{ fontSize: 12, opacity: 0.8, margin: '0 0 16px 0' }}>변호사 없이 직접 소송하는 방법을 안내합니다</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: '소송비용 안내', href: '#' },
                  { label: '관할법원 찾기', href: '#' },
                  { label: '소장 작성하기', href: '/apply' },
                ].map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => item.href === '/apply' ? handleAuthRequired('/apply') : undefined}
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: 4,
                        padding: '7px 14px',
                        fontSize: 13,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      › {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 자주 찾는 서류 카드 (light blue) */}
            <div style={{
              background: '#e8f0fe',
              border: '1px solid #c5d8f6',
              borderRadius: 8,
              padding: '20px',
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 'bold', color: '#1a3a6b', margin: '0 0 4px 0' }}>자주 찾는 서류</h3>
              <p style={{ fontSize: 12, color: '#5573a3', margin: '0 0 16px 0' }}>많이 이용하는 서류를 바로 작성하세요</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {frequentDocs.map((doc, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handleAuthRequired('/apply')}
                      style={{
                        background: '#fff',
                        color: '#1a3a6b',
                        border: '1px solid #c5d8f6',
                        borderRadius: 4,
                        padding: '7px 14px',
                        fontSize: 13,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      📄 {doc}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 공지사항 + 절차안내 */}
          <div id="procedure" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* 공지사항 */}
            <div style={{
              background: '#fff',
              border: '1px solid #dde1e7',
              borderRadius: 8,
              padding: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 'bold', color: '#1a3a6b', margin: 0 }}>공지사항</h3>
                <span style={{ fontSize: 11, color: '#888', cursor: 'pointer' }}>더보기 &gt;</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notices.map((n, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#2952a3', fontSize: 10 }}>●</span>
                      {n.text}
                    </span>
                    <span style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap', marginLeft: 8 }}>{n.date}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 절차안내 */}
            <div style={{
              background: '#fff',
              border: '1px solid #dde1e7',
              borderRadius: 8,
              padding: '20px',
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 'bold', color: '#1a3a6b', margin: '0 0 14px 0' }}>절차안내</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {procedures.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#f7f9fc',
                      border: '1px solid #dde1e7',
                      borderRadius: 6,
                      padding: '14px 12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{p.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: '#1a3a6b', marginBottom: 3 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: '#777' }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 하단 배너 */}
          <div style={{
            background: '#e8eaed',
            borderRadius: 8,
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}>
            {bottomBanners.map((b, i) => (
              <button
                key={i}
                onClick={() => b.href === '/apply' ? handleAuthRequired('/apply') : undefined}
                style={{
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 22 }}>{b.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: '#1a3a6b' }}>{b.label}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

      <Footer />

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
}
