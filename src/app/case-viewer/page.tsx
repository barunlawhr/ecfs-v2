'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface RecordItem { date: string; name: string; type: string }
const RECORDS: RecordItem[] = [
  { date:'2023.07.27', name:'소장', type:'' },
  { date:'2023.07.27', name:'소장 서증', type:'' },
  { date:'2023.09.04', name:'참여관유 주소보정명령/보정서', type:'' },
  { date:'2023.09.06', name:'소송위임장', type:'원본' },
  { date:'2023.09.06', name:'담당변호사 지정서', type:'' },
  { date:'2023.09.12', name:'주소보정서(홍길동)', type:'' },
  { date:'2023.09.12', name:'주소보정서(홍길동) 첨부', type:'' },
  { date:'2023.09.12', name:'사실조회신청서(바른시스템즈)', type:'' },
  { date:'2023.09.12', name:'사실조회신청서(바른텔레콤 주식회사)', type:'' },
  { date:'2023.09.12', name:'사실조회신청서(바른유플러스)', type:'' },
  { date:'2023.09.12', name:'보정기한연장신청서', type:'원본' },
  { date:'2023.09.13', name:'사실조회회신(바른시스템즈)', type:'' },
  { date:'2023.09.13', name:'사실조회서', type:'' },
  { date:'2023.09.13', name:'사실조회서', type:'' },
  { date:'2023.09.13', name:'사실조회서', type:'' },
  { date:'2023.09.14', name:'사실조회회신(바른텔레콤 주식회사)', type:'' },
  { date:'2023.09.15', name:'보정서', type:'' },
  { date:'2023.09.15', name:'보정서 서증', type:'' },
  { date:'2023.10.05', name:'답변서(김바른)', type:'' },
  { date:'2023.10.05', name:'답변서 서증(김바른)', type:'' },
  { date:'2023.10.12', name:'변론기일통지서', type:'' },
  { date:'2023.10.20', name:'준비서면(원고)', type:'' },
  { date:'2023.10.20', name:'준비서면 서증(원고)', type:'' },
  { date:'2023.11.02', name:'변론조서', type:'' },
  { date:'2023.11.15', name:'준비서면(피고 김바른)', type:'' },
]

interface EvidenceItem { num: string; name: string; side: string; hasOriginal: boolean }
const PLAINTIFF_EV: EvidenceItem[] = [
  { num:'갑1', name:'각 계약서', side:'조사', hasOriginal: false },
  { num:'갑1', name:'각 계약서', side:'조사', hasOriginal: false },
  { num:'갑2', name:'각 임금내역', side:'조사', hasOriginal: false },
  { num:'갑3', name:'공소장(사기, 피고인 홍길동)', side:'조사', hasOriginal: false },
  { num:'갑4', name:'대법원 나의 사건 검색', side:'조사', hasOriginal: false },
  { num:'갑5-1', name:'계좌입출금내역', side:'조사', hasOriginal: true },
  { num:'갑5-2', name:'계좌입출금내역', side:'조사', hasOriginal: true },
  { num:'갑6-1', name:'영수증 및 입출금거래내역', side:'조사', hasOriginal: true },
  { num:'갑6-2', name:'영수증 및 입출금거래내역', side:'조사', hasOriginal: true },
  { num:'갑7', name:'고소장(2021. 2. 17.자)', side:'조사', hasOriginal: false },
  { num:'갑8', name:'바른핀치 소개란', side:'조사', hasOriginal: false },
  { num:'갑9', name:'바른핀치의 인스타그램 게시물1,2', side:'조사', hasOriginal: false },
  { num:'갑10', name:'팬싸 네이버카페 게시글', side:'조사', hasOriginal: false },
  { num:'갑11', name:'고소보충의견서(2021. 4. 12.자)', side:'조사', hasOriginal: false },
  { num:'갑12', name:'각 인스타그램 게시물', side:'조사', hasOriginal: false },
  { num:'갑13', name:'각 팬싸 카페 게시물', side:'조사', hasOriginal: false },
  { num:'갑14', name:'2020. 6. 18.자 녹취록', side:'조사', hasOriginal: false },
  { num:'갑15', name:'2020. 7. 12.자 녹취록', side:'조사', hasOriginal: false },
  { num:'갑16', name:'2020. 9. 20.자 녹취록', side:'조사', hasOriginal: false },
]

const COMPLAINT_TEXT = `                         사건번호 가단 5727

                      소    장

원  고   1. 홍  길  동
         2. 이  바  른
         3. 김  나  래
         4. 장  상  숙
         5. 최  지  혜

     소  가   134,000,000원
     청구확대 인지액   775,000원
     쌍방대 인지액      775,000원
     합  계            156,000원


피  고   1. 김  바  른
         2. 임  선  희


손해배상 등 청구의 소


청 구 취 지

1. 피고들은 연대하여,
   가. 원고 홍길동에게 금 50,000,000원
   나. 원고 이바른에게 금 30,000,000원
   다. 원고 김나래에게 금 24,000,000원
   라. 원고 장상숙에게 금 15,000,000원
   마. 원고 최지혜에게 금 15,000,000원
   및 위 각 금원에 대하여 이 사건 소장 부본
   송달일 다음 날부터 다 갚는 날까지 연 12%의
   비율에 의한 금원을 지급하라.
2. 소송비용은 피고들이 부담한다.
3. 제1항은 가집행할 수 있다.
라는 판결을 구합니다.

청 구 원 인

1. 당사자들의 관계
   원고들은 피고 김바른이 운영하는 '바른핀치'라는
   엔터테인먼트 회사에 연습생 또는 매니저로
   근무하였던 사람들입니다.

   피고 김바른은 바른핀치의 대표이사이고,
   피고 임선희는 바른핀치의 이사입니다.

2. 피고들의 불법행위
   피고들은 원고들에게 허위의 데뷔 약속을 하여
   금원을 편취하고, 정당한 임금을 지급하지
   아니하였습니다.

   가. 원고 홍길동에 대한 불법행위
      피고들은 2019년 3월경 원고 홍길동에게
      "3개월 이내에 데뷔시켜 주겠다"라고
      허위 약속을 하고 레슨비 명목으로
      금 50,000,000원을 편취하였습니다.

   나. 원고 이바른에 대한 불법행위
      피고들은 2019년 5월경 원고 이바른에게
      기획사 소속 매니저 채용을 약속하고
      보증금 명목으로 금 30,000,000원을
      편취하였습니다.

3. 결론
   이에 원고들은 피고들에게 위와 같은 금원의
   반환 및 손해배상을 구하기 위하여 이 사건
   소를 제기합니다.

입 증 방 법

1. 갑 제1호증     각 계약서
2. 갑 제2호증     각 임금내역
3. 갑 제3호증     공소장
4. 갑 제4호증     대법원 나의 사건 검색
5. 갑 제5호증의 1  계좌입출금내역
6. 갑 제5호증의 2  계좌입출금내역
7. 갑 제6호증의 1  영수증 및 입출금거래내역
8. 갑 제6호증의 2  영수증 및 입출금거래내역

첨 부 서 류

1. 위 입증방법          각 1통
2. 소장부본              1통
3. 송달료납부서          1통

2023. 7. 27.

원고들 소송대리인
변호사   이    바    른

서울중앙지방법원  귀중`

function CaseViewerInner() {
  const params = useSearchParams()
  const caseNum = params.get('case') || '2023가단5727'
  const [selectedRecord, setSelectedRecord] = useState(0)
  const [activeTab, setActiveTab] = useState<'전체'|'실체'|'절차'|'기일'|'보류'>('전체')
  const [evidenceTab, setEvidenceTab] = useState<'서증목록'|'증인목록'|'첨부'>('서증목록')
  const [evidenceFilter, setEvidenceFilter] = useState<'전체'|'원고'|'피고'|'독립'|'보류'>('전체')
  const [zoom, setZoom] = useState(90)

  const filteredRecords = activeTab === '전체' ? RECORDS
    : activeTab === '실체' ? RECORDS.filter(r => ['소장','답변서','준비서면','보정서'].some(k => r.name.includes(k)))
    : activeTab === '절차' ? RECORDS.filter(r => ['통지','위임','지정','보정명령','조서'].some(k => r.name.includes(k)))
    : activeTab === '기일' ? RECORDS.filter(r => r.name.includes('기일') || r.name.includes('조서'))
    : []

  const filteredEvidence = evidenceFilter === '전체' ? PLAINTIFF_EV
    : evidenceFilter === '원고' ? PLAINTIFF_EV
    : []

  const tabCounts = { '전체': RECORDS.length, '실체': RECORDS.filter(r => ['소장','답변서','준비서면','보정서'].some(k => r.name.includes(k))).length, '절차': RECORDS.filter(r => ['통지','위임','지정','보정명령','조서'].some(k => r.name.includes(k))).length, '기일': RECORDS.filter(r => r.name.includes('기일') || r.name.includes('조서')).length, '보류': 0 }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', fontFamily:"'Malgun Gothic','맑은 고딕',sans-serif", fontSize:13 }}>
      {/* 상단 바 */}
      <div style={{ background:'linear-gradient(90deg,#1a1a2e,#3a3a5e)', color:'#fff', display:'flex', alignItems:'center', padding:'0 16px', height:44, flexShrink:0, gap:16 }}>
        <span style={{ fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:'#ff6b6b' }}>●</span> 사건기록열람
        </span>
        <span style={{ background:'rgba(255,255,255,.15)', padding:'3px 14px', borderRadius:3, fontSize:12, fontWeight:600 }}>• {caseNum} 손해배상 등</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:20, fontSize:12 }}>
          <span><strong>원고측</strong> 홍길동 외 4명</span><span style={{ opacity:.5 }}>|</span>
          <span><strong>피고측</strong> 김바른 외 1명</span><span style={{ opacity:.5 }}>|</span>
          <span><strong>재판부</strong> 민사21단독</span>
        </div>
      </div>

      {/* 툴바 */}
      <div style={{ background:'#f0f2f5', borderBottom:'1px solid #ccc', display:'flex', alignItems:'center', gap:4, padding:'4px 10px', flexShrink:0, flexWrap:'wrap' }}>
        {['☐ 서증등록목록','☐ 증인등록목록','📥 기록다운로드','📋 사건기록관리','🖨 각종목록출력','⚙ 프로그램설치'].map(btn => (
          <button key={btn} style={{ height:28, padding:'0 10px', background:'#fff', border:'1px solid #bbb', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{btn}</button>
        ))}
      </div>

      {/* 3패널 */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── 좌측: 기록목록 ── */}
        <div style={{ width:280, borderRight:'1px solid #ccc', display:'flex', flexDirection:'column', background:'#fff', flexShrink:0 }}>
          <div style={{ padding:'8px 10px', fontWeight:700, fontSize:13, borderBottom:'1px solid #ddd', color:'#333' }}>기록목록</div>
          <div style={{ display:'flex', borderBottom:'1px solid #ddd' }}>
            {(['전체','실체','절차','기일','보류'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex:1, padding:'6px 0', fontSize:10, border:'none', cursor:'pointer', fontFamily:'inherit',
                borderBottom: activeTab === tab ? '2px solid #003366' : '2px solid transparent',
                background:'transparent', fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? '#003366' : '#666',
              }}>{tab}({tabCounts[tab]})</button>
            ))}
          </div>
          <div style={{ display:'flex', background:'#f5f7fa', padding:'4px 8px', borderBottom:'1px solid #ddd', fontSize:10, fontWeight:600, color:'#555' }}>
            <span style={{ width:70 }}>기준일자 ⇅</span>
            <span style={{ flex:1 }}>문건명 ⇅</span>
            <span style={{ width:32, textAlign:'center' }}>진행</span>
            <span style={{ width:38, textAlign:'center' }}>상세메뉴</span>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filteredRecords.map((r, i) => (
              <div key={i} onClick={() => setSelectedRecord(i)} style={{
                display:'flex', padding:'6px 8px', borderBottom:'1px solid #eee', cursor:'pointer', alignItems:'center',
                background: selectedRecord === i ? '#fffde6' : '#fff',
              }}>
                <span style={{ width:70, fontSize:10, color: selectedRecord === i ? '#c00' : '#333', flexShrink:0 }}>{r.date}</span>
                <span style={{ flex:1, fontSize:11, color: selectedRecord === i ? '#c00' : '#0067c2', fontWeight: selectedRecord === i ? 700 : 400, lineHeight:1.3, wordBreak:'break-all' }}>{r.name}</span>
                <span style={{ width:32, textAlign:'center', flexShrink:0 }}>
                  {r.type && <span style={{ fontSize:8, background:'#0067c2', color:'#fff', padding:'1px 3px', borderRadius:2, fontWeight:700 }}>{r.type}</span>}
                </span>
                <span style={{ width:38, textAlign:'center', flexShrink:0 }}>
                  <button style={{ height:18, padding:'0 4px', border:'1px solid #bbb', background:'#fff', borderRadius:2, fontSize:9, cursor:'pointer', fontFamily:'inherit' }}>선택</button>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 중앙: 문서뷰어 ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#e8e8e8', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', background:'#ddd', padding:'0 8px', height:28, gap:4, flexShrink:0 }}>
            <span style={{ fontSize:11, cursor:'pointer' }}>‹</span>
            <span style={{ background:'#fff', border:'1px solid #bbb', borderRadius:'3px 3px 0 0', padding:'2px 12px', fontSize:11, fontWeight:600 }}>
              {filteredRecords[selectedRecord]?.name || '소장'} ✕
            </span>
            <span style={{ fontSize:11, cursor:'pointer' }}>›</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, background:'#f5f5f5', padding:'3px 8px', borderBottom:'1px solid #ccc', flexShrink:0 }}>
            {['🖨','💾','📋','✋','📄','↺'].map((icon,i) => (
              <button key={i} style={{ width:24, height:24, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer', fontSize:12 }}>{icon}</button>
            ))}
            <span style={{ fontSize:11, color:'#555', margin:'0 4px' }}>—</span>
            <span style={{ fontSize:11, fontWeight:600 }}>{zoom} %</span>
            <button onClick={() => setZoom(z => Math.max(30, z-10))} style={{ width:24, height:24, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer', fontSize:13 }}>−</button>
            <button onClick={() => setZoom(z => Math.min(200, z+10))} style={{ width:24, height:24, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer', fontSize:13 }}>+</button>
            <button style={{ width:24, height:24, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer', fontSize:12 }}>🔍</button>
          </div>
          <div style={{ flex:1, overflow:'auto', display:'flex', justifyContent:'center', padding:16, background:'#888' }}>
            <div style={{
              background:'#fff', width: 520, minHeight:750, padding:'40px 50px', boxShadow:'0 2px 16px rgba(0,0,0,.4)',
              fontSize:13, whiteSpace:'pre-wrap', lineHeight:1.9, fontFamily:"'Batang','바탕',serif",
              transform:`scale(${zoom/100})`, transformOrigin:'top center',
            }}>
              {COMPLAINT_TEXT}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'5px 0', background:'#f5f5f5', borderTop:'1px solid #ccc', flexShrink:0, fontSize:11 }}>
            <input type="text" defaultValue="1" style={{ width:28, height:22, textAlign:'center', border:'1px solid #bbb', borderRadius:2, fontSize:11 }} />
            <span>/ 12</span>
            <button style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>‹</button>
            <button style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>›</button>
            <button onClick={() => setZoom(z => Math.max(30, z-10))} style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>−</button>
            <button onClick={() => setZoom(z => Math.min(200, z+10))} style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>+</button>
            <button style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>🔍</button>
            <span style={{ marginLeft:8, color:'#888' }}>1/12</span>
          </div>
        </div>

        {/* ── 우측: 서증목록 ── */}
        <div style={{ width:320, borderLeft:'1px solid #ccc', display:'flex', flexDirection:'column', background:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', borderBottom:'1px solid #ddd' }}>
            {(['서증목록','증인목록','첨부'] as const).map(tab => (
              <button key={tab} onClick={() => setEvidenceTab(tab)} style={{
                flex:1, padding:'7px 0', fontSize:12, border:'none', cursor:'pointer', fontFamily:'inherit',
                borderBottom: evidenceTab === tab ? '2px solid #003366' : '2px solid transparent',
                background:'transparent', fontWeight: evidenceTab === tab ? 700 : 400,
                color: evidenceTab === tab ? '#003366' : '#666',
              }}>{tab}</button>
            ))}
          </div>
          <div style={{ display:'flex', borderBottom:'1px solid #ddd', padding:'0 2px' }}>
            <span style={{ fontSize:10, color:'#888', cursor:'pointer', padding:'0 2px' }}>‹</span>
            {(['전체','원고','피고','독립','보류'] as const).map(f => (
              <button key={f} onClick={() => setEvidenceFilter(f)} style={{
                flex:1, padding:'5px 0', fontSize:10, border:'none', cursor:'pointer', fontFamily:'inherit',
                color: evidenceFilter === f ? '#003366' : '#666',
                fontWeight: evidenceFilter === f ? 700 : 400,
                textDecoration: evidenceFilter === f ? 'underline' : 'none',
                background:'transparent',
              }}>{f}({f === '전체' ? PLAINTIFF_EV.length : f === '원고' ? PLAINTIFF_EV.length : 0})</button>
            ))}
            <span style={{ fontSize:10, color:'#888', cursor:'pointer', padding:'0 2px' }}>›</span>
          </div>
          <div style={{ display:'flex', background:'#f5f7fa', padding:'4px 8px', borderBottom:'1px solid #ddd', fontSize:10, fontWeight:600, color:'#555' }}>
            <span style={{ width:42 }}>번호 ⇅</span>
            <span style={{ flex:1 }}>서증명</span>
            <span style={{ width:28, textAlign:'center' }}>비고</span>
            <span style={{ width:40, textAlign:'center' }}>상세메뉴</span>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filteredEvidence.map((ev, i) => (
              <div key={i} style={{ display:'flex', padding:'5px 8px', borderBottom:'1px solid #eee', alignItems:'center' }}>
                <span style={{ width:42, fontSize:10, color:'#333', fontWeight:600, flexShrink:0 }}>{ev.num}</span>
                <span style={{ flex:1, fontSize:11, color:'#0067c2', cursor:'pointer', lineHeight:1.3 }}>{ev.name}</span>
                <span style={{ width:28, textAlign:'center', fontSize:9, color:'#555', flexShrink:0 }}>{ev.side}</span>
                <span style={{ width:40, textAlign:'center', display:'flex', gap:2, justifyContent:'center', flexShrink:0 }}>
                  {ev.hasOriginal && <span style={{ fontSize:8, background:'#0067c2', color:'#fff', padding:'1px 3px', borderRadius:2 }}>원본</span>}
                  <button style={{ height:16, padding:'0 3px', border:'1px solid #bbb', background:'#fff', borderRadius:2, fontSize:8, cursor:'pointer', fontFamily:'inherit' }}>선택</button>
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
    <Suspense fallback={<div style={{ padding:40, textAlign:'center' }}>로딩 중...</div>}>
      <CaseViewerInner />
    </Suspense>
  )
}
