// ══════════════════════════════════════════════════════════════
//  ecfs-v2 공통 디자인 시스템
//  [바른커리어] 전자소송모의실습사이트 — 공통 색상, 폰트, 레이아웃, 스타일 객체
// ══════════════════════════════════════════════════════════════

// ── 주요 색상 ────────────────────────────────────────────────
export const TEAL = '#00a99d'          // 포인트 컬러 (버튼, 링크, 강조)
export const TEAL_DARK = '#007a84'     // 호버, 진한 포인트
export const NAVY = '#1a3a6b'          // 헤더, 타이틀, 주요 버튼
export const DARK_NAVY = '#003087'     // 사이드바 활성, 강조 헤더
export const RED = '#e8173e'           // 알림, 필수표시(*)
export const BLUE = '#0067c2'          // 링크 텍스트

// ── 텍스트 색상 ──────────────────────────────────────────────
export const TEXT_PRIMARY = '#222222'
export const TEXT_SECONDARY = '#555555'
export const TEXT_MUTED = '#888888'
export const TEXT_LIGHT = '#aaaaaa'

// ── 배경 색상 ────────────────────────────────────────────────
export const BG_PAGE = '#f2f4f7'       // 전체 페이지 배경
export const BG_WHITE = '#ffffff'
export const BG_LIGHT = '#f7f9fc'      // 섹션 배경
export const BG_TABLE_HEAD = '#f0f4fa' // 테이블 헤더

// ── 테두리 ───────────────────────────────────────────────────
export const BORDER = '#d0d8e4'
export const BORDER_LIGHT = '#e0e6ee'

// ── 폰트 ─────────────────────────────────────────────────────
export const FONT_FAMILY = "'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif"

export const FONT_XS = '10px'
export const FONT_SM = '11px'
export const FONT_BASE = '12px'
export const FONT_MD = '13px'
export const FONT_LG = '14px'
export const FONT_XL = '16px'
export const FONT_2XL = '18px'
export const FONT_3XL = '24px'

export const WEIGHT_NORMAL = 400
export const WEIGHT_SEMIBOLD = 600
export const WEIGHT_BOLD = 700
export const WEIGHT_EXTRABOLD = 800

// ── 레이아웃 ─────────────────────────────────────────────────
export const MAX_WIDTH = '1160px'
export const SIDEBAR_WIDTH = '170px'

// ══════════════════════════════════════════════════════════════
//  공통 인라인 스타일 객체 (React.CSSProperties)
// ══════════════════════════════════════════════════════════════

/** 테이블 헤더 셀 (TH) */
export const TH: React.CSSProperties = {
  background: '#f5f7fb',
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 700,
  borderRight: '1px solid #d0d8e4',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

/** 테이블 데이터 셀 (TD) */
export const TD: React.CSSProperties = {
  padding: '8px 10px',
  verticalAlign: 'middle',
}

/** 인풋 필드 */
export const INP: React.CSSProperties = {
  height: 28,
  border: '1px solid #c8cdd6',
  borderRadius: 2,
  padding: '0 8px',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  color: '#222',
  background: '#fff',
  boxSizing: 'border-box',
}

/** 셀렉트 */
export const SEL: React.CSSProperties = {
  ...INP,
  padding: '0 6px',
  cursor: 'pointer',
}

// ══════════════════════════════════════════════════════════════
//  법원 목록 (전국 법원 + 지원)
// ══════════════════════════════════════════════════════════════
export const COURTS = [
  '서울회생법원','서울중앙지방법원','서울동부지방법원','서울남부지방법원','서울북부지방법원','서울서부지방법원',
  '의정부지방법원','의정부지법 고양지원','파주시법원','포천시법원','의정부지법 남양주지원',
  '동두천시법원','가평군법원','연천군법원','철원군법원',
  '인천지방법원','인천지법 부천지원','김포시법원','강화군법원',
  '수원지방법원','수원지법 성남지원','수원지법 여주지원','수원지법 평택지원','수원지법 안산지원','수원지법 안양지원',
  '춘천지방법원','춘천지법 강릉지원','춘천지법 원주지원','춘천지법 속초지원','춘천지법 영월지원',
  '청주지방법원','청주지법 충주지원','청주지법 제천지원','청주지법 영동지원',
  '대전지방법원','대전지법 홍성지원','대전지법 논산지원','대전지법 천안지원','대전지법 서산지원','대전지법 공주지원',
  '전주지방법원','전주지법 군산지원','전주지법 정읍지원','전주지법 남원지원',
  '광주지방법원','광주지법 목포지원','광주지법 장흥지원','광주지법 순천지원','광주지법 해남지원',
  '부산지방법원','부산지법 동부지원','부산지법 서부지원',
  '울산지방법원',
  '창원지방법원','창원지법 마산지원','창원지법 진주지원','창원지법 통영지원','창원지법 밀양지원','창원지법 거창지원',
  '대구지방법원','대구지법 서부지원','대구지법 안동지원','대구지법 경주지원','대구지법 포항지원',
  '대구지법 김천지원','대구지법 상주지원','대구지법 의성지원','대구지법 영덕지원',
  '제주지방법원',
] as const

// ══════════════════════════════════════════════════════════════
//  GNB 메뉴 구조
// ══════════════════════════════════════════════════════════════
export const GNB_MENUS = ['나의전자소송', '서류제출', '각종신청', '사건유형별 절차안내', '고객센터'] as const

// ══════════════════════════════════════════════════════════════
//  서류제출 메뉴
// ══════════════════════════════════════════════════════════════
export const SUBMIT_CATEGORIES = [
  '민사 서류', '형사 서류', '가사 서류', '보호 서류',
  '행정 서류', '특허 서류', '회생·파산 서류', '민사집행 서류', '비송·과태료 서류',
] as const

export const SUBMIT_FREQUENT_DOCS = [
  '답변서(청구취지/원인)', '준비서면', '증인신청서',
  '청구취지 및 청구원인 변경신청서', '소취하서',
  '소송대리허가신청 및 소송위임장', '보정서',
  '주소보정서(특별송달,공시송달)', '기일변경신청서',
  '항소장', '항고장', '소송위임장',
] as const

// ══════════════════════════════════════════════════════════════
//  나의전자소송 퀵메뉴
// ══════════════════════════════════════════════════════════════
export const MYCASE_QUICK_MENUS = [
  '나의사건관리', '작성중서류', '미확인송달문서',
  '제증명발급', '소송비용납부', '알림서비스',
] as const

// ══════════════════════════════════════════════════════════════
//  실습 안내 배너 스타일
// ══════════════════════════════════════════════════════════════
export const MOCK_BANNER_STYLE: React.CSSProperties = {
  background: '#fffbeb',
  border: '1px solid #ffc107',
  color: '#856404',
  padding: '8px 16px',
  fontSize: 12,
  textAlign: 'center',
}

export const MOCK_BANNER_TEXT = '⚠️ [바른커리어] 전자소송모의실습사이트 — 실제 법원 접수 시스템이 아니며, 작성된 내용은 법적 효력이 없습니다.'

// ══════════════════════════════════════════════════════════════
//  Footer 정보
// ══════════════════════════════════════════════════════════════
export const FOOTER_LINKS = [
  '이용약관', '개인정보처리방침', '저작권보호정책', '링크시유의사항',
  '문제해결안내', '고객의소리', '사이트맵',
] as const

export const FOOTER_CONTACT = '이용 및 장애 문의: 02) 3480-1715 (평일 9시~18시)'
export const FOOTER_COPYRIGHT = 'COPYRIGHT © 바른커리어. ALL RIGHTS RESERVED.'
