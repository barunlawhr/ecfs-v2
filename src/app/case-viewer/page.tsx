'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// 기록목록 mock 데이터
interface RecordItem { date: string; name: string; type: '원본' | ''; tag: string }
const RECORDS: RecordItem[] = [
  { date: '2025.03.12', name: '소장', type: '', tag: '' },
  { date: '2025.03.12', name: '소장 첨부', type: '원본', tag: '' },
  { date: '2025.03.12', name: '소장 서증', type: '원본', tag: '' },
]

// 서증목록 mock 데이터
interface EvidenceItem { num: string; name: string; side: '접수' | ''; hasOriginal: boolean }
const EVIDENCES: EvidenceItem[] = [
  { num: '갑1', name: '법인등기부', side: '접수', hasOriginal: true },
  { num: '갑2', name: '사업자등록증', side: '접수', hasOriginal: false },
  { num: '갑3', name: '현장 촬영 사진', side: '접수', hasOriginal: false },
  { num: '갑4-1', name: '진단서', side: '접수', hasOriginal: true },
  { num: '갑4-2', name: '소견서', side: '접수', hasOriginal: true },
  { num: '갑5-1', name: '2024.8. 퇴원 확인서', side: '접수', hasOriginal: false },
  { num: '갑5-2', name: '2024.8. 진료기록', side: '접수', hasOriginal: false },
  { num: '갑5-3', name: '2024.11. 진료기록', side: '접수', hasOriginal: false },
  { num: '갑5-4', name: '2024.8. 검사결과서', side: '접수', hasOriginal: false },
  { num: '갑5-5', name: '2024.11. 검사결과서', side: '접수', hasOriginal: false },
  { num: '갑5-6', name: '2024.8. 진단서', side: '접수', hasOriginal: false },
  { num: '갑5-7', name: '2024.11. 진단서', side: '접수', hasOriginal: false },
  { num: '갑6-1', name: '건설업체 검색 결과', side: '접수', hasOriginal: false },
  { num: '갑6-2', name: '건설업체 검색 결과 2', side: '접수', hasOriginal: false },
]

// 소장 본문 mock
const COMPLAINT_BODY = `소    장

원    고  박준호(891221-*******)
          서울 강남구 테헤란로 127, 501호 (역삼동, 하나빌딩)
          원고 소송대리인
          변호사 정일호
          서울 강서구 마곡중앙로 161-17, 601호 (마곡동, 보타닉파크타워 I )
          ( 전화: 02-887-9896   팩스: 02-887-9897
            이메일: lawoffice@example.com )

피    고  1. 주식회사 하나솔루션즈(법인등록번호&220111-0142710)
             제주시 조천읍 조천14길 30 (조천읍)
             사내이사 김종민
          2. 주식회사 블루오션테크(법인등록번호&230111-05...)
             울산 남구 갈밭로 12 진우빌딩 4층 (상산동)
             사내이사 강영우

손해배상(기) 청구의 소

청구취지

1. 피고들은 원고에게 금 33,969,584원과 이에 대하여 2024. 8. 8. 부터
   이 사건 소장부본 송달일까지는 연 5%의, 그 다음날 부터 다 갚는 날
   까지는 연 12%의 각 비율에 의한 금원을 지급하라.
2. 소송비용은 피고들이 부담한다.
3. 제1항은 가집행 할 수 있다.

청구원인

1. 당사자의 지위
   원고는 서울 강남구에 거주하는 자로서, 2024년 7월경 피고 주식회사
   하나솔루션즈와 건축공사 도급계약을 체결하였습니다.

2. 사고 경위
   2024년 8월 8일 피고 회사가 시공하던 공사현장에서 안전조치 미흡으로
   인하여 원고가 부상을 입게 되었습니다.

3. 손해의 발생
   원고는 위 사고로 인하여 다음과 같은 손해를 입었습니다.
   가. 치료비: 금 8,969,584원
   나. 일실수입: 금 15,000,000원
   다. 위자료: 금 10,000,000원
   합계: 금 33,969,584원

입증방법

1. 갑 제1호증  법인등기부
2. 갑 제2호증  사업자등록증
3. 갑 제3호증  현장 촬영 사진
4. 갑 제4호증의 1  진단서
5. 갑 제4호증의 2  소견서

첨부서류

1. 위 입증방법     각 1통
2. 소장부본        1통
3. 송달료납부서    1통

2025. 3. 12.

원고 소송대리인
변호사  정   일   호

제주지방법원  귀중`

function CaseViewerInner() {
  const params = useSearchParams()
  const caseNum = params.get('case') || '2025가단7122'
  const [selectedRecord, setSelectedRecord] = useState(0)
  const [activeTab, setActiveTab] = useState<'전체' | '실체' | '절차' | '기일' | '보류'>('전체')
  const [evidenceTab, setEvidenceTab] = useState<'서증목록' | '증인목록' | '첨부'>('서증목록')
  const [evidenceFilter, setEvidenceFilter] = useState<'전체' | '원고' | '피고' | '독립' | '보류'>('전체')
  const [zoom, setZoom] = useState(80)

  const tabCounts = { '전체': RECORDS.length, '실체': RECORDS.length, '절차': 0, '기일': 0, '보류': 0 }
  const evFilterCounts = { '전체': EVIDENCES.length, '원고': EVIDENCES.length, '피고': 0, '독립': 0, '보류': 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", fontSize: 13 }}>
      {/* 상단 바 */}
      <div style={{ background: '#8b1a1a', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', height: 44, flexShrink: 0, gap: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#ff6b6b' }}>●</span> 사건기록열람
        </span>
        <span style={{ background: '#6b1010', padding: '3px 12px', borderRadius: 3, fontSize: 12, fontWeight: 600 }}>• {caseNum} 손해배상(기)</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, fontSize: 12 }}>
          <span><strong>원고측</strong> 박준호</span>
          <span>|</span>
          <span><strong>피고측</strong> 주식회사 하나솔루션즈 외 1명</span>
          <span>|</span>
          <span>재판부</span>
        </div>
      </div>

      {/* 툴바 */}
      <div style={{ background: '#f0f2f5', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', flexShrink: 0 }}>
        {['서증등록목록', '증인등록목록', '기록다운로드', '사건기록관리', '각종목록출력', '프로그램설치'].map(btn => (
          <button key={btn} style={{ height: 28, padding: '0 10px', background: '#fff', border: '1px solid #bbb', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
            📄 {btn}
          </button>
        ))}
      </div>

      {/* 3패널 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 좌측: 기록목록 */}
        <div style={{ width: 300, borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
          <div style={{ padding: '8px 10px', fontWeight: 700, fontSize: 13, borderBottom: '1px solid #ddd', color: '#333' }}>기록목록</div>
          {/* 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            {(['전체', '실체', '절차', '기일', '보류'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: '7px 0', fontSize: 11, border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #003366' : '2px solid transparent',
                background: 'transparent', fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? '#003366' : '#666', fontFamily: 'inherit',
              }}>{tab}({tabCounts[tab]})</button>
            ))}
          </div>
          {/* 테이블 헤더 */}
          <div style={{ display: 'flex', background: '#f5f7fa', padding: '5px 8px', borderBottom: '1px solid #ddd', fontSize: 10, fontWeight: 600, color: '#555' }}>
            <span style={{ width: 75 }}>기준일자 ⇅</span>
            <span style={{ flex: 1 }}>문건명 ⇅</span>
            <span style={{ width: 36, textAlign: 'center' }}>진행</span>
            <span style={{ width: 44, textAlign: 'center' }}>상세메뉴</span>
          </div>
          {/* 기록 리스트 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {RECORDS.map((r, i) => (
              <div key={i} onClick={() => setSelectedRecord(i)} style={{
                display: 'flex', padding: '7px 8px', borderBottom: '1px solid #eee', cursor: 'pointer', alignItems: 'center',
                background: selectedRecord === i ? '#fffde6' : '#fff',
              }}>
                <span style={{ width: 75, fontSize: 11, color: selectedRecord === i ? '#c00' : '#333' }}>{r.date}</span>
                <span style={{ flex: 1, fontSize: 12, color: selectedRecord === i ? '#c00' : '#0067c2', fontWeight: selectedRecord === i ? 700 : 400 }}>{r.name}</span>
                <span style={{ width: 36, textAlign: 'center' }}>
                  {r.type && <span style={{ fontSize: 9, background: '#0067c2', color: '#fff', padding: '1px 4px', borderRadius: 2, fontWeight: 700 }}>{r.type}</span>}
                </span>
                <span style={{ width: 44, textAlign: 'center' }}>
                  <button style={{ height: 20, padding: '0 6px', border: '1px solid #bbb', background: '#fff', borderRadius: 2, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>선택</button>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 중앙: 문서뷰어 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e8e8e8', minWidth: 0 }}>
          {/* 문서 탭 */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#ddd', padding: '0 8px', height: 30, gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#333', cursor: 'pointer' }}>‹</span>
            <span style={{ background: '#fff', border: '1px solid #bbb', borderRadius: '3px 3px 0 0', padding: '3px 12px', fontSize: 11, fontWeight: 600, color: '#333' }}>
              {RECORDS[selectedRecord]?.name || '소장'} ✕
            </span>
            <span style={{ fontSize: 11, color: '#333', cursor: 'pointer' }}>›</span>
          </div>
          {/* 뷰어 툴바 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f5f5', padding: '4px 10px', borderBottom: '1px solid #ccc', flexShrink: 0 }}>
            {['🖨', '💾', '📋', '✋', '📄', '↺'].map((icon, i) => (
              <button key={i} style={{ width: 26, height: 26, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 13 }}>{icon}</button>
            ))}
            <span style={{ margin: '0 4px', fontSize: 11, color: '#555' }}>—</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{zoom}%</span>
            <span style={{ margin: '0 4px', fontSize: 11, color: '#555' }}>—</span>
            <button onClick={() => setZoom(z => Math.max(30, z - 10))} style={{ width: 26, height: 26, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 14 }}>−</button>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} style={{ width: 26, height: 26, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 14 }}>+</button>
            <button style={{ width: 26, height: 26, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 13 }}>🔍</button>
          </div>
          {/* 문서 내용 */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 20, background: '#b0b0b0' }}>
            <div style={{
              background: '#fff', width: `${zoom * 5}px`, minHeight: 700, padding: 48, boxShadow: '0 2px 12px rgba(0,0,0,.3)',
              fontSize: `${Math.max(10, zoom * 0.14)}px`, whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: "'Batang','바탕',serif",
              transform: `scale(${zoom / 100})`, transformOrigin: 'top center',
            }}>
              {COMPLAINT_BODY}
            </div>
          </div>
          {/* 페이지 네비 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 0', background: '#f5f5f5', borderTop: '1px solid #ccc', flexShrink: 0 }}>
            <input type="text" value="1" readOnly style={{ width: 30, height: 24, textAlign: 'center', border: '1px solid #bbb', borderRadius: 2, fontSize: 12 }} />
            <span style={{ fontSize: 12, color: '#555' }}>/ 12</span>
            <button style={{ width: 24, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 12 }}>‹</button>
            <button style={{ width: 24, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 12 }}>›</button>
            <button onClick={() => setZoom(z => Math.max(30, z - 10))} style={{ width: 24, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 14 }}>−</button>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} style={{ width: 24, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 14 }}>+</button>
            <button style={{ width: 24, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 2, cursor: 'pointer', fontSize: 13 }}>🔍</button>
          </div>
        </div>

        {/* 우측: 서증목록 */}
        <div style={{ width: 340, borderLeft: '1px solid #ccc', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
          {/* 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            {(['서증목록', '증인목록', '첨부'] as const).map(tab => (
              <button key={tab} onClick={() => setEvidenceTab(tab)} style={{
                flex: 1, padding: '8px 0', fontSize: 12, border: 'none', cursor: 'pointer',
                borderBottom: evidenceTab === tab ? '2px solid #003366' : '2px solid transparent',
                background: 'transparent', fontWeight: evidenceTab === tab ? 700 : 400,
                color: evidenceTab === tab ? '#003366' : '#666', fontFamily: 'inherit',
              }}>{tab}</button>
            ))}
          </div>
          {/* 필터 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd', alignItems: 'center', padding: '0 4px' }}>
            <span style={{ fontSize: 11, color: '#888', cursor: 'pointer', padding: '0 2px' }}>‹</span>
            {(['전체', '원고', '피고', '독립', '보류'] as const).map(f => (
              <button key={f} onClick={() => setEvidenceFilter(f)} style={{
                flex: 1, padding: '6px 0', fontSize: 11, border: 'none', cursor: 'pointer',
                background: 'transparent', fontFamily: 'inherit',
                color: evidenceFilter === f ? '#003366' : '#666',
                fontWeight: evidenceFilter === f ? 700 : 400,
                textDecoration: evidenceFilter === f ? 'underline' : 'none',
              }}>{f}({evFilterCounts[f]})</button>
            ))}
            <span style={{ fontSize: 11, color: '#888', cursor: 'pointer', padding: '0 2px' }}>›</span>
          </div>
          {/* 서증 헤더 */}
          <div style={{ display: 'flex', background: '#f5f7fa', padding: '5px 8px', borderBottom: '1px solid #ddd', fontSize: 10, fontWeight: 600, color: '#555' }}>
            <span style={{ width: 48 }}>번호 ⇅</span>
            <span style={{ flex: 1 }}>서증명</span>
            <span style={{ width: 30, textAlign: 'center' }}>비고</span>
            <span style={{ width: 44, textAlign: 'center' }}>상세메뉴</span>
          </div>
          {/* 서증 리스트 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {EVIDENCES.map((ev, i) => (
              <div key={i} style={{ display: 'flex', padding: '6px 8px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                <span style={{ width: 48, fontSize: 11, color: '#333', fontWeight: 600 }}>{ev.num}</span>
                <span style={{ flex: 1, fontSize: 11, color: '#0067c2', cursor: 'pointer' }}>{ev.name}</span>
                <span style={{ width: 30, textAlign: 'center' }}>
                  <span style={{ fontSize: 9, color: '#555' }}>{ev.side}</span>
                </span>
                <span style={{ width: 44, textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {ev.hasOriginal && <span style={{ fontSize: 9, background: '#0067c2', color: '#fff', padding: '1px 3px', borderRadius: 2 }}>원본</span>}
                  <button style={{ height: 18, padding: '0 4px', border: '1px solid #bbb', background: '#fff', borderRadius: 2, fontSize: 9, cursor: 'pointer', fontFamily: 'inherit' }}>선택</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CaseViewerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>로딩 중...</div>}>
      <CaseViewerInner />
    </Suspense>
  )
}
